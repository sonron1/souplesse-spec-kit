import { defineEventHandler, getHeader, createError } from 'h3'
import { verifyJwt } from '../utils/jwt'
import type { JwtPayload } from '../utils/jwt'
import logger from '../utils/logger'
import { userRepository } from '../repositories/user.repository'

declare module 'h3' {
  interface H3EventContext {
    user?: JwtPayload
  }
}

/**
 * Auth middleware — validates the Bearer JWT from the Authorization header
 * and attaches the decoded payload to event.context.user.
 *
 * Routes that require auth should check event.context.user themselves,
 * or use the requireAuth() helper.
 */
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return // unauthenticated; individual routes decide if they require auth
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyJwt(token)
    event.context.user = payload
  } catch (err) {
    // "jwt malformed" = stale/corrupted cookie from a previous session — not an attack.
    // Log at debug to avoid noise. Other JWT errors (expired, invalid sig) remain warn.
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'jwt malformed' || msg === 'jwt expired') {
      logger.debug({ msg }, 'JWT ignoré dans auth middleware (cookie périmé ou expiré)')
    } else {
      logger.warn({ err }, 'JWT invalide dans auth middleware')
    }
    // Don't throw here — let route handlers decide if auth is required
  }
})

/**
 * Asserts that the current request has a valid authenticated user.
 * Also verifies single-session token (C004): if the JWT’s sessionToken does not
 * match the one stored in DB, the session was revoked (another device logged in).
 * Throws HTTP 401 otherwise.
 */
export async function requireAuth(event: { context: { user?: JwtPayload } }): Promise<JwtPayload> {
  if (!event.context.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const payload = event.context.user

  // C004: verify session token against DB (single-session enforcement)
  if (payload.sessionToken) {
    const dbUser = await userRepository.findById(payload.sub)
    if (!dbUser || dbUser.sessionToken !== payload.sessionToken) {
      throw createError({ statusCode: 401, data: { code: 'session_revoked' }, message: 'Votre session a été fermée sur cet appareil' })
    }
  }

  return payload
}
