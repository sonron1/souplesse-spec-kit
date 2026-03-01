import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { validateBody } from '../../validators/index'
import { subscriptionService } from '../../services/subscription.service'
import { paymentService } from '../../services/payment.service'
import { z } from 'zod'

const createSessionSchema = z.object({
  planId: z.string().uuid(),
  type: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await validateBody(event, createSessionSchema)

  // Create a PENDING subscription first
  const subscription = await subscriptionService.createSubscription(
    user.sub,
    body.planId,
    body.type
  )

  // Create a Stripe Checkout Session
  const session = await paymentService.createStripeSession({
    userId: user.sub,
    subscriptionId: subscription.id,
    planId: body.planId,
    amount: subscription.subscriptionPlan?.priceSingle ?? 0,
    currency: 'XOF',
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
  })

  return { success: true, subscriptionId: subscription.id, ...session }
})
