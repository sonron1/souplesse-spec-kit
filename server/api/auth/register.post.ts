import { defineEventHandler } from 'h3'
import { validateBody } from '../../validators/index'
import { registerSchema } from '../../validators/auth.schemas'
import { authService } from '../../services/auth.service'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'

const registerRateLimit = rateLimitMiddleware({ max: 5, windowMs: 60_000, keyPrefix: 'register' })

export default defineEventHandler(async (event) => {
  await registerRateLimit(event)
  const body = await validateBody(event, registerSchema)
  const result = await authService.register(body)
  return { success: true, ...result }
})
