import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { authService } from '../../services/auth.service'
import { validateBody } from '../../validators'
import { updateProfileSchema } from '../../validators/auth.schemas'

/**
 * PATCH /api/auth/me — update the profile of the authenticated user (A011)
 * Editable: firstName, lastName, phone, gender, birthDay, birthMonth, avatarUrl
 * Not editable here: email, role
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await validateBody(event, updateProfileSchema)
  return authService.updateProfile(user.sub, body)
})
