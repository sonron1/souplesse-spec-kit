import { defineEventHandler, getHeader, createError } from 'h3'
import { verifyJwt } from '../utils/jwt'
import type { JwtPayload } from '../utils/jwt'
import logger from '../utils/logger'

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
 * Throws HTTP 401 otherwise.
 */
export function requireAuth(event: { context: { user?: JwtPayload } }): JwtPayload {
  if (!event.context.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }
  return event.context.user
}
