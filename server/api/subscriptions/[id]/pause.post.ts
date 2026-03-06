import { defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireRole } from '../../../utils/role'
import { subscriptionService } from '../../../services/subscription.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'CLIENT')

  const id = getRouterParam(event, 'id')!
  const subscription = await subscriptionService.pauseSubscription(id, user.sub)
  return { success: true, subscription }
})
