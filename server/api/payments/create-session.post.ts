import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { validateBody } from '../../validators/index'
import { createPaymentOrder } from '../../services/payments.service'
import { prisma } from '../../utils/prisma'
import { z } from 'zod'

const createSessionSchema = z.object({
  subscriptionPlanId: z.string().uuid(),
  // FR-016: optional partner email for couple/duo plans
  partnerEmail: z.string().email().optional(),
})

/**
 * POST /api/payments/create-session
 * Creates a Kkiapay payment order for a subscription plan.
 * For couple plans, accepts an optional partnerEmail to activate a
 * subscription for a second user upon payment success.
 * Returns a kkiapayToken to initialise the Kkiapay widget on the client.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'CLIENT') // Only clients can purchase subscriptions
  const body = await validateBody(event, createSessionSchema)

  // Resolve partnerEmail to a userId (FR-016)
  let partnerUserId: string | undefined
  if (body.partnerEmail) {
    const partnerEmail = body.partnerEmail.toLowerCase().trim()
    if (partnerEmail === user.email?.toLowerCase().trim()) {
      throw createError({ statusCode: 400, message: 'Vous ne pouvez pas vous désigner comme partenaire.' })
    }
    const partnerUser = await prisma.user.findUnique({ where: { email: partnerEmail } })
    if (!partnerUser) {
      throw createError({ statusCode: 404, message: 'Aucun compte trouvé pour cette adresse email partenaire.' })
    }
    if (partnerUser.role !== 'CLIENT') {
      throw createError({ statusCode: 400, message: 'Le partenaire doit être un client.' })
    }
    partnerUserId = partnerUser.id
  }

  // L001: For couple plans, validate opposite genders (MALE ↔ FEMALE)
  if (partnerUserId) {
    const [requester, partner] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.sub }, select: { gender: true } }),
      prisma.user.findUnique({ where: { id: partnerUserId }, select: { gender: true } }),
    ])
    if (!requester?.gender || !partner?.gender || requester.gender === partner.gender) {
      throw createError({
        statusCode: 400,
        statusMessage: 'incompatible_genders',
        message: 'Les abonnements couple nécessitent un homme et une femme.',
      })
    }
  }

  try {
    const result = await createPaymentOrder({
      userId: user.sub,
      subscriptionPlanId: body.subscriptionPlanId,
      partnerUserId,
    })

    return {
      success: true,
      orderId: result.order.id,
      kkiapayToken: result.kkiapayToken,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment order creation failed'
    throw createError({ statusCode: 500, message })
  }
})
