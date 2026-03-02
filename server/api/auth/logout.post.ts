import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { authService } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  await authService.logout(user.sub)
  return { success: true, message: 'Logged out' }
})
