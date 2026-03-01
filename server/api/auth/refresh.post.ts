import { defineEventHandler } from 'h3'
import { validateBody } from '../../validators/index'
import { refreshTokenSchema } from '../../validators/auth.schemas'
import { authService } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  const { refreshToken } = await validateBody(event, refreshTokenSchema)
  const tokens = await authService.refreshToken(refreshToken)
  return { success: true, tokens }
})
