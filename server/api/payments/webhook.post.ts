import { defineEventHandler, getHeader, readRawBody } from 'h3'
import { paymentService } from '../../services/payment.service'
import logger from '../../utils/logger'

/**
 * Stripe webhook handler.
 * Receives POST from Stripe, verifies signature, and processes the event.
 */
export default defineEventHandler(async (event) => {
  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    logger.warn('Stripe webhook called without stripe-signature header')
    return { error: 'Missing stripe-signature' }
  }

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    return { error: 'Empty body' }
  }

  await paymentService.handleStripeWebhook(rawBody, signature)
  return { received: true }
})
