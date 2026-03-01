import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { validateBody } from '../../validators/index'
import { createPaymentOrder } from '../../services/payments.service'
import { z } from 'zod'

const createSessionSchema = z.object({
  subscriptionPlanId: z.string().uuid(),
})

/**
 * POST /api/payments/create-session
 * Creates a Kkiapay payment order for a subscription plan.
 * Returns a kkiapayToken to initialise the Kkiapay widget on the client.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await validateBody(event, createSessionSchema)

  try {
    const result = await createPaymentOrder({
      userId: user.sub,
      subscriptionPlanId: body.subscriptionPlanId,
    })

    return {
      success: true,
      orderId: result.order.id,
      kkiapayToken: result.kkiapayToken,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment order creation failed'
    throw createError({ statusCode: 500, statusMessage: message })
  }
})
