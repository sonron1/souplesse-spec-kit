import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { userRepository } from '../repositories/user.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { createError } from 'h3'
import logger from '../utils/logger'
import { systemLog } from '../utils/systemLog'
import { sendVerificationEmail } from '../utils/email'
import type { RegisterInput, LoginInput } from '../validators/auth.schemas'

const BCRYPT_ROUNDS = 12
/** Max consecutive failed login attempts before account lockout. */
const MAX_LOGIN_ATTEMPTS = 5
/** Lockout duration: 15 minutes. */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

/**
 * Auth service — handles registration, login, token refresh, and logout.
 * Passwords are never stored or returned in plain text.
 */
export const authService = {
  /**
   * Register a new CLIENT user.
   * Does NOT issue tokens — the user must verify their email before logging in.
   * Throws HTTP 409 if email already exists.
   */
  async register(input: RegisterInput): Promise<{ user: AuthUser }> {
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw createError({ statusCode: 409, message: 'Cette adresse email est déjà utilisée' })
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    // Generate a secure email verification token (T0218)
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'CLIENT',
      emailVerificationToken,
    })

    logger.info({ userId: user.id }, 'User registered — awaiting email verification')
    // Send verification email (non-blocking — never blocks registration)
    void sendVerificationEmail(user.email, emailVerificationToken)
    systemLog({ action: 'USER_REGISTERED', userId: user.id, message: `New account (pending verification): ${user.email}` })

    return { user: _safeUser(user) }
  },

  /**
   * Resend the verification email for an unverified account.
   * Silently succeeds even for unknown emails (prevents user enumeration).
   */
  async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email)
    // Silently ignore if email unknown or already verified
    if (!user || user.emailVerified) return

    // Generate a fresh token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    await userRepository.update(user.id, { emailVerificationToken })
    void sendVerificationEmail(user.email, emailVerificationToken)
    logger.info({ userId: user.id }, 'Verification email resent')
  },

  /**
   * Login with email + password.
   * - Checks account lockout (T0217): rejects if lockedUntil > now
   * - Increments loginAttempts on failure; locks after MAX_LOGIN_ATTEMPTS
   * - Resets loginAttempts on success
   * Throws HTTP 401 for invalid credentials; HTTP 423 when locked.
   */
  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email)
    if (!user) {
      // Don't reveal whether the email exists
      throw createError({ statusCode: 401, message: 'Identifiants invalides' })
    }

    // Email verification check (T0218) — only block if emailVerified field is false
    // (users created by seed/admin have emailVerified=true and are exempt)
    if (user.emailVerified === false) {
      throw createError({
        statusCode: 403,
        message: 'Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte mail.',
      })
    }

    // Account lockout check (T0217)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw createError({
        statusCode: 423,
        message: `Compte temporairement bloqué après trop de tentatives. Réessayez dans ${minutesLeft} minute(s).`,
      })
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) {
      // Increment attempt counter; lock if threshold reached
      await userRepository.incrementLoginAttempts(user.id, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS)
      throw createError({ statusCode: 401, message: 'Identifiants invalides' })
    }

    // Successful login — reset counter
    await userRepository.resetLoginAttempts(user.id)

    const tokens = await _issueTokens(user.id, user.email, user.role)
    logger.info({ userId: user.id }, 'User logged in')
    systemLog({ action: 'USER_LOGIN', userId: user.id, message: `Login: ${user.email}` })

    return { user: _safeUser(user), tokens }
  },

  /**
   * Refresh access+refresh token pair using a valid refresh token.
   * Throws HTTP 401 if token is invalid or revoked.
   */
  async refreshToken(token: string): Promise<AuthTokens> {
    let payload: ReturnType<typeof verifyRefreshToken>
    try {
      payload = verifyRefreshToken(token)
    } catch {
      throw createError({ statusCode: 401, message: 'Token de rafraîchissement invalide ou expiré' })
    }

    const user = await userRepository.findById(payload.sub)
    if (!user || user.refreshToken !== token) {
      throw createError({ statusCode: 401, message: 'Token de rafraîchissement révoqué' })
    }

    const tokens = await _issueTokens(user.id, user.email, user.role)
    return tokens
  },

  /**
   * Revoke the stored refresh token for the user (logout).
   */
  async logout(userId: string): Promise<void> {
    await userRepository.clearRefreshToken(userId)
    logger.info({ userId }, 'User logged out')
  },

  /**
   * Verify an email address using the token sent on registration (T0218).
   * Sets emailVerified = true and clears the token.
   * Throws 404 if the token is invalid or already consumed.
   */
  async verifyEmail(token: string): Promise<{ email: string }> {
    const user = await userRepository.findByVerificationToken(token)
    if (!user) {
      throw createError({ statusCode: 404, message: 'Token de vérification invalide ou déjà utilisé.' })
    }
    await userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
    })
    logger.info({ userId: user.id }, 'Email verified')
    return { email: user.email }
  },
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function _issueTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
  const base = { sub: userId, email, role }
  const accessToken = signAccessToken(base)
  const refreshToken = signRefreshToken(base)
  await userRepository.update(userId, { refreshToken })
  return { accessToken, refreshToken }
}

function _safeUser(user: { id: string; name: string; email: string; role: string }): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
