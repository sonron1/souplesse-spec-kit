import { defineEventHandler, readBody } from 'h3'
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
  const user = requireAuth(event)

  const body = await readBody(event)
  const parse = ConfirmBody.safeParse(body)
  if (!parse.success) {
    return { statusCode: 400, body: { error: 'invalid_body', details: parse.error.flatten() } }
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

  try {
    const result = await confirmPayment({
      userId: user.sub,
      transactionId: parse.data.transactionId,
      subscriptionPlanId: parse.data.subscriptionPlanId,
      partnerUserId,
    })
    return { statusCode: 200, body: { ok: true, subscriptionId: result.subscriptionId } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'confirm_failed'
    return { statusCode: 500, body: { error: 'confirm_failed', message } }
  }
})
