import { defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireRole } from '../../../utils/role'
import { subscriptionService } from '../../../services/subscription.service'
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware'

const resumeRateLimit = rateLimitMiddleware({ max: 5, windowMs: 60_000, keyPrefix: 'sub-resume' })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'CLIENT')
  await resumeRateLimit(event)

  const id = getRouterParam(event, 'id')!
  const subscription = await subscriptionService.resumeSubscription(id, user.sub)
  return { success: true, subscription }
})
