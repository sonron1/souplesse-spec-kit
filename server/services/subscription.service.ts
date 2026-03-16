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
   * Idempotent -- safe to call multiple times with the same subscriptionId.
   * Copies maxReports from the plan at activation time.
   * Cumulative: if user already has an active sub for this plan, extends from its expiresAt.
   */
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

    // Cumul: if we extended from an existing active sub, deactivate that old one now
    // so the user has only one ACTIVE sub per plan at any time (no duplicates).
    if (activeForPlan) {
      await prisma.subscription.update({
        where: { id: activeForPlan.id },
        data: { status: 'EXPIRED', isActive: false },
      })
      logger.info({ supersededId: activeForPlan.id, newId: subscriptionId }, 'Old subscription superseded by cumulated renewal')
    }

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

  /**
   * Pause an active subscription. Increments pauseCount and records pausedAt.
   * Status stays ACTIVE but the cron job will skip paused subs from expiring.
   * Checks that pauseCount < plan.maxPauses before allowing.
   */
  async pauseSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { subscriptionPlan: true },
    })
    if (!sub) throw createError({ statusCode: 404, message: 'Abonnement introuvable' })
    if (sub.userId !== userId) throw createError({ statusCode: 403, message: 'Accès refusé' })
    if (sub.status !== 'ACTIVE') throw createError({ statusCode: 400, message: 'L\'abonnement n\'est pas actif' })
    if (sub.pausedAt) throw createError({ statusCode: 400, message: 'L\'abonnement est déjà en pause' })

    const maxPauses = sub.subscriptionPlan?.maxPauses ?? 0
    if (sub.pauseCount >= maxPauses) {
      throw createError({ statusCode: 400, message: `Nombre de pauses maximum atteint (${maxPauses})` })
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        pausedAt: new Date(),
        pauseCount: { increment: 1 },
      },
    })
    logger.info({ subscriptionId, userId }, 'Subscription paused')

    // J005: Notify admins by email; J006: Create in-app Notification for each admin
    try {
      const pausingUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true } })
      const planName = sub.subscriptionPlan?.name ?? 'Abonnement'
      const userLabel = pausingUser?.name ?? pausingUser?.email ?? userId

      await Promise.all(admins.map(async (admin) => {
        // J006: in-app notification
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SUBSCRIPTION_PAUSED',
            title: 'Abonnement mis en pause',
            body: `${userLabel} a mis en pause son abonnement "${planName}". Pauses utilisées : ${updated.pauseCount}/${sub.subscriptionPlan?.maxPauses ?? 0}.`,
          },
        })
      }))

      // J005: admin emails via Resend
      const { sendAdminPauseNotification } = await import('../utils/email').catch(() => ({ sendAdminPauseNotification: null }))
      if (sendAdminPauseNotification) {
        await sendAdminPauseNotification({ adminEmails: admins.map(a => a.email), userLabel, planName, pauseCount: updated.pauseCount, maxPauses: sub.subscriptionPlan?.maxPauses ?? 0 })
      }
    } catch (notifyErr) {
      logger.error({ notifyErr }, 'Failed to send pause notifications to admins (non-fatal)')
    }

    return updated
  },

  /**
   * Resume a paused subscription. Clears pausedAt and extends expiresAt by the pause duration.
   */
  async resumeSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    if (!sub) throw createError({ statusCode: 404, message: 'Abonnement introuvable' })
    if (sub.userId !== userId) throw createError({ statusCode: 403, message: 'Accès refusé' })
    if (!sub.pausedAt) throw createError({ statusCode: 400, message: 'L\'abonnement n\'est pas en pause' })

    const pausedMs = Date.now() - sub.pausedAt.getTime()
    const newExpiry = sub.expiresAt ? new Date(sub.expiresAt.getTime() + pausedMs) : null

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        pausedAt: null,
        pausedUntil: null,
        ...(newExpiry ? { expiresAt: newExpiry } : {}),
      },
    })
    logger.info({ subscriptionId, userId, pausedMs }, 'Subscription resumed, expiry extended')
    return updated
  },
}