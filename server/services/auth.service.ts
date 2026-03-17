import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { userRepository } from '../repositories/user.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { createError } from 'h3'
import logger from '../utils/logger'
import { systemLog } from '../utils/systemLog'
import { sendVerificationEmail } from '../utils/email'
import type { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput } from '../validators/auth.schemas'

const BCRYPT_ROUNDS = 12
/** Max consecutive failed login attempts before account lockout. */
const MAX_LOGIN_ATTEMPTS = 5
/** Lockout duration: 15 minutes. */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000
/** Email verification token validity: 24 hours. */
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  email: string
  phone?: string | null
  gender?: string | null
  birthDay?: number | null
  birthMonth?: number | null
  avatarUrl?: string | null
  role: string
  createdAt?: Date | null
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
      throw createError({ statusCode: 409, data: { code: 'email_taken' }, message: 'Cette adresse email est déjà utilisée' })
    }

    // A008: check phone uniqueness
    if (input.phone) {
      const existingPhone = await userRepository.findByPhone(input.phone)
      if (existingPhone) {
        throw createError({ statusCode: 409, data: { code: 'phone_taken' }, message: 'Ce numéro de téléphone est déjà utilisé' })
      }
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    // Generate a secure email verification token (T0218)
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')

    // Build display name from firstName + lastName
    const name = `${input.firstName} ${input.lastName}`.trim()

    const user = await userRepository.create({
      name,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      gender: input.gender as 'MALE' | 'FEMALE',
      birthDay: input.birthDay ?? null,
      birthMonth: input.birthMonth ?? null,
      email: input.email,
      passwordHash,
      role: 'CLIENT',
      emailVerificationToken,
      emailVerificationTokenCreatedAt: new Date(),
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

    // Generate a fresh token and reset the TTL clock
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    await userRepository.update(user.id, {
      emailVerificationToken,
      emailVerificationTokenCreatedAt: new Date(),
    })
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

    // Email verification check (T0218) — block when emailVerified is false OR null
    // (users created by seed/admin have emailVerified=true and are exempt)
    if (!user.emailVerified) {
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

    // C003: generate a new sessionToken to revoke any existing sessions
    const sessionToken = crypto.randomUUID()
    await userRepository.updateSessionToken(user.id, sessionToken)

    const tokens = await _issueTokens(user.id, user.email, user.role, sessionToken)
    logger.info({ userId: user.id }, 'User logged in')
    systemLog({ action: 'USER_LOGIN', userId: user.id, message: `Login: ${user.email}` })

    return { user: _safeUser(user), tokens }
  },

  /**
   * Refresh access+refresh token pair using a valid refresh token.
   * Throws HTTP 401 if token is invalid or revoked.
   * C003/C004: validates the session token to enforce single-device sessions.
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

    // C003: if the refresh token embeds a sessionToken, verify it still matches
    // the one stored in DB. A mismatch means another device has logged in since.
    if (payload.sessionToken && user.sessionToken !== payload.sessionToken) {
      throw createError({
        statusCode: 401,
        data: { code: 'session_revoked' },
        message: 'Votre session a été fermée sur cet appareil',
      })
    }

    // Carry the current DB sessionToken forward so future requireAuth checks work
    const tokens = await _issueTokens(user.id, user.email, user.role, user.sessionToken ?? undefined)
    return tokens
  },

  /**
   * Revoke the stored refresh token for the user (logout).
   */
  async logout(userId: string): Promise<void> {
    await userRepository.clearRefreshToken(userId)
    // C005: revoke session token so existing access tokens are invalidated
    await userRepository.updateSessionToken(userId, null)
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

    // Enforce 24-hour TTL on verification tokens
    if (user.emailVerificationTokenCreatedAt) {
      const age = Date.now() - user.emailVerificationTokenCreatedAt.getTime()
      if (age > EMAIL_TOKEN_TTL_MS) {
        // Invalidate the expired token so it cannot be retried
        await userRepository.update(user.id, {
          emailVerificationToken: null,
          emailVerificationTokenCreatedAt: null,
        })
        throw createError({
          statusCode: 410,
          message: 'Ce lien de vérification a expiré. Veuillez en demander un nouveau.',
        })
      }
    }

    await userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenCreatedAt: null,
    })
    logger.info({ userId: user.id }, 'Email verified')
    return { email: user.email }
  },

  /**
   * Return the full profile of the authenticated user (A010).
   */
  async getProfile(userId: string): Promise<AuthUser> {
    const user = await userRepository.findById(userId)
    if (!user) throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })
    return _safeUser(user)
  },

  /**
   * Update the profile of the authenticated user (A011).
   * Email and role are not updatable here.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
    // Check phone uniqueness if changed
    if (input.phone) {
      const existing = await userRepository.findByPhone(input.phone)
      if (existing && existing.id !== userId) {
        throw createError({ statusCode: 409, data: { code: 'phone_taken' }, message: 'Ce numéro de téléphone est déjà utilisé' })
      }
    }

    // Rebuild display name if first/last name changes
    const current = await userRepository.findById(userId)
    if (!current) throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })

    const firstName = input.firstName ?? current.firstName ?? ''
    const lastName = input.lastName ?? current.lastName ?? ''
    const name = `${firstName} ${lastName}`.trim() || current.name

    const updated = await userRepository.update(userId, {
      name,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      phone: input.phone ?? undefined,
      gender: (input.gender as 'MALE' | 'FEMALE' | undefined) ?? undefined,
      birthDay: input.birthDay ?? undefined,
      birthMonth: input.birthMonth ?? undefined,
      avatarUrl: input.avatarUrl ?? undefined,
    })
    return _safeUser(updated)
  },

  /**
   * Change the password of the authenticated user.
   * Verifies the current password before hashing and storing the new one.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user) throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!valid) throw createError({ statusCode: 401, data: { code: 'wrong_password' }, message: 'Mot de passe actuel incorrect' })

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS)
    await userRepository.update(userId, { passwordHash })
    logger.info({ userId }, 'Password changed')
  },
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function _issueTokens(userId: string, email: string, role: string, sessionToken?: string): Promise<AuthTokens> {
  const base = { sub: userId, email, role, ...(sessionToken ? { sessionToken } : {}) }
  const accessToken = signAccessToken(base)
  const refreshToken = signRefreshToken(base)
  await userRepository.update(userId, { refreshToken })
  return { accessToken, refreshToken }
}

function _safeUser(user: {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  email: string
  phone?: string | null
  gender?: string | null
  birthDay?: number | null
  birthMonth?: number | null
  avatarUrl?: string | null
  role: string
  createdAt?: Date | null
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDay: user.birthDay,
    birthMonth: user.birthMonth,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  }
}
