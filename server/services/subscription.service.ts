import prisma from '../utils/prisma'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Subscription } from '@prisma/client'

export const subscriptionService = {
  /**
   * Create a PENDING subscription for a user with a selected plan.
   */
  async createSubscription(
    userId: string,
    planId: string,
    type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<Subscription> {
    // Verify plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      throw createError({ statusCode: 404, statusMessage: 'Subscription plan not found' })
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
   * Idempotent — safe to call multiple times with the same subscriptionId.
   */
  async activateSubscription(subscriptionId: string): Promise<Subscription> {
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    if (!sub) {
      throw createError({ statusCode: 404, statusMessage: 'Subscription not found' })
    }

    if (sub.status === 'ACTIVE') {
      return sub // already active — idempotent
    }

    const now = new Date()
    const planDays = await _getPlanValidityDays(sub.subscriptionPlanId)
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + planDays)

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        startDate: now,
        endDate,
        startsAt: now,
        expiresAt: endDate,
      },
    })

    logger.info({ subscriptionId, userId: sub.userId }, 'Subscription activated')
    return updated
  },

  /**
   * Expire subscriptions that have passed their end date.
   * Intended to be called by a scheduled job.
   */
  async expireSubscriptions(): Promise<number> {
    const { count } = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: new Date() },
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
        endDate: { gte: new Date() },
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

async function _getPlanValidityDays(planId: string | null): Promise<number> {
  if (!planId) return 30
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  return plan?.validityDays ?? 30
}
