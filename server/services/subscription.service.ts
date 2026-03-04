import { prisma } from '../utils/prisma'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Subscription } from '.prisma/client'

export const subscriptionService = {
  /**
   * Create a PENDING subscription for a user with a selected plan.
   */
  async createSubscription(
    userId: string,
    planId: string,
    type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' = 'MONTHLY'
  ): Promise<Subscription> {
    // Verify plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      throw createError({ statusCode: 404, message: 'Formule d\'abonnement introuvable' })
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        subscriptionPlanId: planId,
        type,
        status: 'PENDING',
        isActive: false,
      },
    })

    logger.info({ subscriptionId: subscription.id, userId }, 'Subscription created (PENDING)')
    return subscription
  },

  /**
   * Activate a subscription after payment webhook confirms success.
   * Idempotent â€” safe to call multiple times with the same subscriptionId.
   * Copies maxReports from the plan at activation time.
   */
  async activateSubscription(subscriptionId: string): Promise<Subscription> {
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    if (!sub) {
      throw createError({ statusCode: 404, message: 'Abonnement introuvable' })
    }

    if (sub.status === 'ACTIVE') {
      return sub // already active â€” idempotent
    }

    const now = new Date()
    const plan = sub.subscriptionPlanId
      ? await prisma.subscriptionPlan.findUnique({ where: { id: sub.subscriptionPlanId } })
      : null
    const planDays = plan?.validityDays ?? 30
    const planMaxReports = plan?.maxReports ?? 0

  async activateSubscription(subscriptionId: string): Promise<Subscription> {
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    if (!sub) {
      throw createError({ statusCode: 404, message: 'Abonnement introuvable' })
    }

    if (sub.status === 'ACTIVE') {
      return sub // already active — idempotent
    }

    const now = new Date()
    const plan = sub.subscriptionPlanId
      ? await prisma.subscriptionPlan.findUnique({ where: { id: sub.subscriptionPlanId } })
      : null
    const planDays = plan?.validityDays ?? 30
    const planMaxReports = plan?.maxReports ?? 0

    // Cumulative: if the user already has an active subscription for this plan, extend from its expiry
    const activeForPlan = sub.subscriptionPlanId
      ? await prisma.subscription.findFirst({
          where: {
            userId: sub.userId,
            subscriptionPlanId: sub.subscriptionPlanId,
            status: 'ACTIVE',
            id: { not: subscriptionId },
            expiresAt: { gt: now },
          },
          orderBy: { expiresAt: 'desc' },
        })
      : null

    const baseDate = activeForPlan?.expiresAt ?? now
    const expiresAt = new Date(baseDate)
    expiresAt.setDate(expiresAt.getDate() + planDays)

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        activationDate: now,
        startsAt: now,
        expiresAt,
        maxReports: planMaxReports,
      },
    })

    logger.info({ subscriptionId, userId: sub.userId, cumulatedFrom: activeForPlan?.id ?? null }, 'Subscription activated')
    return updated
  },

  /**
   * Expire subscriptions that have passed their expiry date.
   * Intended to be called by a scheduled job.
   */
  async expireSubscriptions(): Promise<number> {
    const { count } = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED', isActive: false },
    })

    if (count > 0) logger.info({ count }, 'Subscriptions expired')
    return count
  },

  /**
   * Check if a user has an active subscription.
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const active = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gte: new Date() },
      },
    })
    return !!active
  },

  /**
   * Get all subscriptions for a user.
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },
}
