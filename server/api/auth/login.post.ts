import { defineEventHandler } from 'h3'
import { validateBody } from '../../validators/index'
import { loginSchema } from '../../validators/auth.schemas'
import { authService } from '../../services/auth.service'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'

// 10 attempts per minute per IP — stacks on top of the per-account lockout in authService.login()
const loginRateLimit = rateLimitMiddleware({ max: 10, windowMs: 60_000, keyPrefix: 'login' })

export default defineEventHandler(async (event) => {
  await loginRateLimit(event)
  const body = await validateBody(event, loginSchema)
  const result = await authService.login(body)
  return { success: true, ...result }
})
