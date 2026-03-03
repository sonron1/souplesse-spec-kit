import bcrypt from 'bcryptjs'
import { userRepository } from '../repositories/user.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { createError } from 'h3'
import logger from '../utils/logger'
import { systemLog } from '../utils/systemLog'
import type { RegisterInput, LoginInput } from '../validators/auth.schemas'

const BCRYPT_ROUNDS = 12

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
   * Throws HTTP 409 if email already exists.
   */
  async register(input: RegisterInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existing = await userRepository.findByEmail(input.email)
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: 'Cette adresse email est déjà utilisée' })
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'CLIENT',
    })

    const tokens = await _issueTokens(user.id, user.email, user.role)
    logger.info({ userId: user.id }, 'User registered')
    systemLog({ action: 'USER_REGISTERED', userId: user.id, message: `New account: ${user.email}` })

    return { user: _safeUser(user), tokens }
  },

  /**
   * Login with email + password.
   * Throws HTTP 401 for invalid credentials.
   */
  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Identifiants invalides' })
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: 'Identifiants invalides' })
    }

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
      throw createError({ statusCode: 401, statusMessage: 'Token de rafraîchissement invalide ou expiré' })
    }

    const user = await userRepository.findById(payload.sub)
    if (!user || user.refreshToken !== token) {
      throw createError({ statusCode: 401, statusMessage: 'Token de rafraîchissement révoqué' })
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
