import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/me/subscription
 * Returns the current user's active subscription status.
 * Coaches and admins always receive { active: true } — they never need a subscription.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Staff roles bypass the subscription gate entirely
  if (user.role !== 'CLIENT') {
    return { active: true, planName: null as string | null, expiresAt: null as string | null, daysLeft: null as number | null }
  }

  const sub = await prisma.subscription.findFirst({
    where: {
      userId: user.sub,
      status: 'ACTIVE',
      expiresAt: { gte: new Date() },
    },
    include: { subscriptionPlan: { select: { name: true } } },
    orderBy: { expiresAt: 'desc' },
  })

  if (!sub) {
    return { active: false, planName: null, expiresAt: null, daysLeft: null }
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(sub.expiresAt!).getTime() - Date.now()) / 86_400_000)
  )

  return {
    active: true,
    planName: sub.subscriptionPlan?.name ?? sub.type,
    expiresAt: sub.expiresAt?.toISOString() ?? null,
    daysLeft,
  }
})
