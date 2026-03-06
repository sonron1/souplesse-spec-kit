import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'

/**
 * GET /api/admin/subscriptions
 * Admin-only: list all subscriptions with user and plan info, paginated.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
  const skip = (page - 1) * limit

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        subscriptionPlan: { select: { id: true, name: true, planType: true } },
      },
    }),
    prisma.subscription.count(),
  ])

  return { success: true, subscriptions, total, page, limit }
})
