import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.sub },
    include: {
      subscriptionPlan: {
        select: { name: true, planType: true, maxPauses: true, priceSingle: true, priceCouple: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Resolve partner display info for couple subscriptions in one query
  const partnerIds = [...new Set(subscriptions.filter(s => s.partnerUserId).map(s => s.partnerUserId!))]
  const partnersMap = new Map<string, { name: string; email: string }>()

  if (partnerIds.length > 0) {
    const partners = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true, email: true, firstName: true, lastName: true },
    })
    for (const p of partners) {
      const displayName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || p.email
      partnersMap.set(p.id, { name: displayName, email: p.email })
    }
  }

  return subscriptions.map(s => ({
    ...s,
    partnerInfo: s.partnerUserId ? (partnersMap.get(s.partnerUserId) ?? null) : null,
  }))
})
