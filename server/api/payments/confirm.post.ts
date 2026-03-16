import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { confirmPayment } from '../../services/payments.service'
import { prisma } from '../../utils/prisma'
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

  // FR-016: resolve partnerEmail to partnerUserId
  let partnerUserId: string | undefined
  if (parse.data.partnerEmail) {
    const partnerUser = await prisma.user.findUnique({
      where: { email: parse.data.partnerEmail.toLowerCase().trim() },
      select: { id: true, role: true },
    })
    if (partnerUser?.role === 'CLIENT') {
      partnerUserId = partnerUser.id
    }
  }

  // L002: For couple plans, validate opposite genders (MALE ↔ FEMALE)
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
    const result = await confirmPayment({
      userId: user.sub,
      transactionId: parse.data.transactionId,
      subscriptionPlanId: parse.data.subscriptionPlanId,
      partnerUserId,
    })
    return { ok: true, subscriptionId: result.subscriptionId, extended: result.extended ?? false }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'confirm_failed'
    console.error('[confirm.post] confirmPayment error:', message)
    throw createError({ statusCode: 502, statusMessage: message })
  }
})
