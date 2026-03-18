import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { notificationService } from '../../services/notification.service'
import { sendSubscriptionReminderEmail } from '../../utils/email'
import logger from '../../utils/logger'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'
import { acquireCronLock, releaseCronLock } from '../../utils/cronLock'

const cronRateLimit = rateLimitMiddleware({ max: 5, windowMs: 60_000, keyPrefix: 'cron-reminders' })

const REMINDER_DAYS = 3
const LOCK_KEY      = 'cron:send-reminders'
const LOCK_TTL_SEC  = 4 * 60 // 4 min — job must finish before next 5-min cron fires

export default defineEventHandler(async (event) => {
  await cronRateLimit(event)

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  // Fail CLOSED: if CRON_SECRET is not configured the endpoint is locked down
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getRequestHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Distributed lock — prevents concurrent execution across serverless instances
  const acquired = await acquireCronLock(LOCK_KEY, LOCK_TTL_SEC)
  if (!acquired) {
    logger.warn('[cron:send-reminders] Another instance is already running — skipping')
    return { success: true, skipped: true, reason: 'concurrent_lock' }
  }

  const now = new Date()
  const startedAt = Date.now()

  try {
    // Window: [now, now + 3 days) — catch ALL subscriptions expiring within 3 days
    // (not just the 24h slice before the 3-day mark).
    // reminderSentAt: null ensures we never double-send even if cron runs late.
    const windowEnd = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000)

    // Find ACTIVE subscriptions expiring in the next 3 days that haven't been reminded yet
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: now, lt: windowEnd },
        reminderSentAt: null,
        pausedAt: null,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
        subscriptionPlan: { select: { name: true } },
      },
    })

    // Find a system admin to use as the internal-message sender
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    let sent = 0

    for (const sub of subscriptions) {
      const planName   = sub.subscriptionPlan?.name ?? 'Abonnement'
      const expiryDate = sub.expiresAt
        ? sub.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'bientôt'

      try {
        // I004–I005 — In-app notification
        await notificationService.create({
          userId: sub.user.id,
          type: 'SUBSCRIPTION_EXPIRING',
          title: 'Votre abonnement expire bientôt',
          body: `Votre ${planName} expire le ${expiryDate}. Renouvelez dès maintenant pour continuer à accéder aux séances.`,
        })

        // I003 — Internal message (admin → client)
        if (adminUser) {
          await prisma.message.create({
            data: {
              senderId:    adminUser.id,
              recipientId: sub.user.id,
              coachId:     adminUser.id,
              clientId:    sub.user.id,
              body: `📅 Rappel : votre ${planName} expire le ${expiryDate}. Rendez-vous sur https://souplessefitness.com/subscribe pour renouveler votre abonnement.`,
            },
          })
        }

        // I001 — Email reminder (graceful skip if RESEND_API_KEY not set)
        await sendSubscriptionReminderEmail(
          sub.user.email,
          sub.user.firstName ?? 'Membre',
          planName,
          expiryDate,
        )

        // Mark as reminded (I007)
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { reminderSentAt: now },
        })

        sent++
      } catch (err) {
        logger.error({ subscriptionId: sub.id, err }, 'Failed to send subscription reminder')
      }
    }

    const durationMs = Date.now() - startedAt
    logger.info({ sent, ranAt: now.toISOString(), durationMs }, 'Subscription reminders sent')
    return { success: true, sent, ranAt: now.toISOString(), durationMs }
  } finally {
    await releaseCronLock(LOCK_KEY)
  }
})
