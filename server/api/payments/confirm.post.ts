import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { confirmPayment } from '../../services/payments.service'
import { prisma } from '../../utils/prisma'
import logger from '../../utils/logger'
import { z } from 'zod'

const ConfirmBody = z.object({
  transactionId: z.string().min(1),
  subscriptionPlanId: z.string().uuid(),
  // FR-016: optional partner email for couple plans
  partnerEmail: z.string().email().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const parse = ConfirmBody.safeParse(body)
  if (!parse.success) {
    throw createError({ statusCode: 400, statusMessage: 'invalid_body', data: parse.error.flatten() })
  }

  // FR-016: resolve partnerEmail → partnerUserId with full validation
  let partnerUserId: string | undefined
  if (parse.data.partnerEmail) {
    const partnerEmail = parse.data.partnerEmail.toLowerCase().trim()

    // A user cannot be their own partner
    const requesterUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { email: true, gender: true },
    })
    if (requesterUser?.email === partnerEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'self_partner',
        message: 'Vous ne pouvez pas vous abonner en couple avec vous-même.',
      })
    }

    const partnerUser = await prisma.user.findUnique({
      where: { email: partnerEmail },
      select: { id: true, role: true, gender: true },
    })

    // Partner must exist and be a CLIENT (not ADMIN/COACH)
    if (!partnerUser || partnerUser.role !== 'CLIENT') {
      throw createError({
        statusCode: 404,
        statusMessage: 'partner_not_found',
        message: 'Aucun compte client trouvé pour cette adresse email partenaire.',
      })
    }

    // L002: Validate opposite genders (MALE ↔ FEMALE)
    if (!requesterUser?.gender || !partnerUser.gender || requesterUser.gender === partnerUser.gender) {
      throw createError({
        statusCode: 400,
        statusMessage: 'incompatible_genders',
        message: 'Les abonnements couple nécessitent un homme et une femme.',
      })
    }

    partnerUserId = partnerUser.id
  }

  try {
    const result = await confirmPayment({
      userId: user.sub,
      transactionId: parse.data.transactionId,
      subscriptionPlanId: parse.data.subscriptionPlanId,
      partnerUserId,
    })
    return { ok: true, subscriptionId: result.subscriptionId, extended: result.extended ?? false }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'confirm_failed'
    logger.error({ err, userId: user.sub }, '[confirm.post] confirmPayment error')
    throw createError({ statusCode: 502, statusMessage: message })
  }
})
