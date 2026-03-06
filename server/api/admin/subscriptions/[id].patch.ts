import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'
import logger from '../../../utils/logger'

const PatchSubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELLED']),
})

/**
 * PATCH /api/admin/subscriptions/:id
 * Admin-only: manually force a subscription status to ACTIVE or CANCELLED.
 * ACTIVE  → sets isActive=true,  activates if startsAt is null
 * CANCELLED → sets isActive=false
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant d\'abonnement manquant' })

  const body = await readBody(event)
  const parsed = PatchSubscriptionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Le statut doit être ACTIVE ou CANCELLED' })
  }

  const { status } = parsed.data

  const existing = await prisma.subscription.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, message: 'Abonnement introuvable' })

  const now = new Date()
  const updateData: Record<string, unknown> = { status, isActive: status === 'ACTIVE' }

  if (status === 'ACTIVE') {
    // If it was never activated, set start date and expiry from the plan
    if (!existing.startsAt) {
      const plan = existing.subscriptionPlanId
        ? await prisma.subscriptionPlan.findUnique({ where: { id: existing.subscriptionPlanId } })
        : null
      const days = plan?.validityDays ?? 30
      const expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + days)
      updateData.activationDate = now
      updateData.startsAt = now
      updateData.expiresAt = expiresAt
    }
  }

  const updated = await prisma.subscription.update({ where: { id }, data: updateData })

  logger.info({ subscriptionId: id, status, adminId: user.sub }, 'Admin manually updated subscription status')
  return { ok: true, subscription: updated }
})
