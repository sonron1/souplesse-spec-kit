import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'
import logger from '../../../utils/logger'

const GrantSchema = z.object({
  userId: z.string().min(1, 'userId requis'),
  subscriptionPlanId: z.string().min(1, 'subscriptionPlanId requis'),
  note: z.string().max(500).optional(),
})

/**
 * POST /api/admin/subscriptions
 * Admin-only: manually grant an active subscription to a user,
 * bypassing payment. If the user already has an active subscription
 * for this plan, the expiry is extended (cumulative).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)

  const body = await readBody(event)
  const parsed = GrantSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }

  const { userId, subscriptionPlanId, note } = parsed.data

  // Verify user exists and is a CLIENT
  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })
  if (targetUser.role !== 'CLIENT') {
    throw createError({ statusCode: 400, message: 'Seuls les clients peuvent recevoir un abonnement' })
  }

  // Verify plan exists
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
  if (!plan || !plan.isActive) {
    throw createError({ statusCode: 404, message: 'Formule introuvable ou inactive' })
  }

  const now = new Date()

  // Check if user already has an ACTIVE subscription for this plan → extend it
  const existing = await prisma.subscription.findFirst({
    where: { userId, subscriptionPlanId, status: 'ACTIVE' },
    orderBy: { expiresAt: 'desc' },
  })

  let subscription

  if (existing && existing.expiresAt && existing.expiresAt > now) {
    // Cumulative: extend from current expiry
    const newExpiry = new Date(existing.expiresAt)
    newExpiry.setDate(newExpiry.getDate() + plan.validityDays)

    subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: { expiresAt: newExpiry, updatedAt: now },
    })

    logger.info(
      { subscriptionId: existing.id, userId, adminId: user.sub, addedDays: plan.validityDays },
      'Admin extended active subscription (cumulative)'
    )
  } else {
    // Create new subscription, immediately ACTIVE
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + plan.validityDays)

    subscription = await prisma.subscription.create({
      data: {
        userId,
        subscriptionPlanId,
        type: (plan.planType?.includes('QUARTERLY') ? 'QUARTERLY' : plan.planType?.includes('ANNUAL') ? 'ANNUAL' : 'MONTHLY') as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
        status: 'ACTIVE',
        isActive: true,
        activationDate: now,
        startsAt: now,
        expiresAt,
        maxReports: plan.maxReports,
      },
    })

    logger.info({ subscriptionId: subscription.id, userId, adminId: user.sub }, 'Admin manually granted subscription')
  }

  // Log to system logs
  await prisma.systemLog.create({
    data: {
      level: 'info',
      action: 'ADMIN_GRANT_SUBSCRIPTION',
      userId: user.sub,
      target: subscription.id,
      message: `Admin ${user.email} granted plan "${plan.name}" to user ${targetUser.email}${note ? ` — Note: ${note}` : ''}`,
      meta: { planId: plan.id, planName: plan.name, targetUserId: userId },
    },
  })

  return { ok: true, subscription, extended: !!existing }
})
