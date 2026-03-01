import { createError } from 'h3'
import type { UserRole } from '@prisma/client'
import type { JwtPayload } from '../utils/jwt'

/**
 * Asserts that the authenticated user has one of the required roles.
 * Must be called after requireAuth() so event.context.user is set.
 *
 * @param user    The JWT payload from event.context.user
 * @param roles   The allowed roles
 */
export function requireRole(user: JwtPayload, ...roles: UserRole[]): void {
  if (!roles.includes(user.role as UserRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden. Required role: ${roles.join(' or ')}`,
    })
  }
}

/**
 * Convenience: assert user is ADMIN.
 */
export function requireAdmin(user: JwtPayload): void {
  requireRole(user, 'ADMIN' as UserRole)
}

/**
 * Convenience: assert user is COACH or ADMIN.
 */
export function requireCoach(user: JwtPayload): void {
  requireRole(user, 'COACH' as UserRole, 'ADMIN' as UserRole)
}
