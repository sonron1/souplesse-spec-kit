import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.sub },
    include: { subscriptionPlan: { select: { name: true, planType: true, maxPauses: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return subscriptions
})
