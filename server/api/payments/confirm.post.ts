import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { confirmPayment } from '../../services/payments.service'
import { z } from 'zod'

const ConfirmBody = z.object({
  transactionId: z.string().min(1),
  subscriptionPlanId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const body = await readBody(event)
  const parse = ConfirmBody.safeParse(body)
  if (!parse.success) {
    return { statusCode: 400, body: { error: 'invalid_body', details: parse.error.flatten() } }
  }

  try {
    const result = await confirmPayment({
      userId: user.id,
      transactionId: parse.data.transactionId,
      subscriptionPlanId: parse.data.subscriptionPlanId,
    })
    return { statusCode: 200, body: { ok: true, subscriptionId: result.subscriptionId } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'confirm_failed'
    return { statusCode: 500, body: { error: 'confirm_failed', message } }
  }
})
