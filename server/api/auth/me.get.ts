import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { authService } from '../../services/auth.service'

/**
 * GET /api/auth/me — return the full profile of the authenticated user (A010)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return authService.getProfile(user.sub)
})
