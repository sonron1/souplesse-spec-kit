import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { notificationService } from '../../services/notification.service'
import logger from '../../utils/logger'

const REMINDER_DAYS = 3

export default defineEventHandler(async (event) => {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  const authHeader = getRequestHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() + (REMINDER_DAYS - 1) * 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000)

  // Find ACTIVE subscriptions expiring in the next 3 days that haven't been reminded yet
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gte: windowStart, lt: windowEnd },
      reminderSentAt: null,
      pausedAt: null,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true } },
      subscriptionPlan: { select: { name: true } },
    },
  })

  let sent = 0

  for (const sub of subscriptions) {
    const planName = sub.subscriptionPlan?.name ?? 'Abonnement'
    const expiryDate = sub.expiresAt
      ? sub.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'bientôt'

    try {
      // In-app notification (I004–I005)
      await notificationService.create({
        userId: sub.user.id,
        type: 'SUBSCRIPTION_EXPIRING',
        title: 'Votre abonnement expire bientôt',
        body: `Votre ${planName} expire le ${expiryDate}. Renouvelez dès maintenant pour continuer à accéder aux séances.`,
      })

      // TODO (I001–I003): Send email notification via email provider (e.g. Resend / Nodemailer)
      // Requires EMAIL_FROM + email provider env vars to be configured.
      // Example: await emailService.sendSubscriptionReminder({ to: sub.user.email, planName, expiryDate })
      logger.info({ userId: sub.user.id, email: sub.user.email, planName, expiryDate }, 'Subscription reminder email stub (email provider not configured)')

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

  logger.info({ sent, ranAt: now.toISOString() }, 'Subscription reminders sent')
  return { success: true, sent, ranAt: now.toISOString() }
})
