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
    return { active: true, planName: null as string | null, expiresAt: null as string | null, daysLeft: null as number | null, isCouple: false, partnerName: null as string | null, maxPauses: 0, pauseCount: 0, maxReports: 0 }
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
    return { active: false, planName: null, expiresAt: null, daysLeft: null, isCouple: false, partnerName: null, maxPauses: 0, pauseCount: 0, maxReports: 0 }
  }

  const daysLeft = Math.max(
    0,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Math.ceil((new Date(sub.expiresAt!).getTime() - Date.now()) / 86_400_000)
  )

  // Resolve partner name when it's a couple subscription
  let partnerName: string | null = null
  if (sub.partnerUserId) {
    const partner = await prisma.user.findUnique({
      where: { id: sub.partnerUserId },
      select: { name: true, firstName: true, lastName: true },
    })
    if (partner) {
      partnerName = [partner.firstName, partner.lastName].filter(Boolean).join(' ') || partner.name
    }
  }

  return {
    active: true,
    planName: sub.subscriptionPlan?.name ?? sub.type,
    expiresAt: sub.expiresAt?.toISOString() ?? null,
    daysLeft,
    isCouple: !!sub.partnerUserId,
    partnerName,
    maxPauses: sub.maxPauses,
    pauseCount: sub.pauseCount,
    maxReports: sub.maxReports ?? 0,
  }
})
