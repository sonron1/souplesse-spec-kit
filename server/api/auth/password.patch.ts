import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { authService } from '../../services/auth.service'
import { validateBody } from '../../validators'
import { changePasswordSchema } from '../../validators/auth.schemas'

/**
 * PATCH /api/auth/password — change the authenticated user's password.
 * Body: { currentPassword, newPassword, confirmPassword }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await validateBody(event, changePasswordSchema)
  await authService.changePassword(user.sub, body)
  return { success: true }
})
