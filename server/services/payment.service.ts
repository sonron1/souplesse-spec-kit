import Stripe from 'stripe'
import { prisma } from '../utils/prisma'
import { subscriptionService } from './subscription.service'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Payment } from '.prisma/client'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key, { apiVersion: '2023-10-16' })
}

export const paymentService = {
  /**
   * Create a Stripe Checkout Session for a subscription plan.
   * Returns the session URL to redirect the user to.
   */
  async createStripeSession(opts: {
    userId: string
    subscriptionId: string
    planId: string
    amount: number // in smallest currency unit
    currency: string
    successUrl: string
    cancelUrl: string
  }): Promise<{ sessionId: string; url: string }> {
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: opts.currency.toLowerCase(),
            product_data: { name: 'Souplesse Fitness Subscription' },
            unit_amount: opts.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: opts.userId,
        subscriptionId: opts.subscriptionId,
        planId: opts.planId,
      },
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    })

    // Record a PENDING payment
    await prisma.payment.create({
      data: {
        userId: opts.userId,
        subscriptionId: opts.subscriptionId,
        stripeSessionId: session.id,
        amount: opts.amount,
        currency: opts.currency,
        status: 'PENDING',
      },
    })

    return { sessionId: session.id, url: session.url! }
  },

  /**
   * Handle an inbound Stripe webhook event.
   * Verifies the signature and processes checkout.session.completed.
   * Idempotent — safe to call multiple times with the same event.
   */
  async handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
    const stripe = getStripe()
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed')
      throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })
    }

    logger.info({ type: event.type, id: event.id }, 'Stripe webhook received')

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      await _fulfillCheckout(session)
    }
  },

  /**
   * Record an idempotent payment from any provider using a providerReference.
   */
  async recordPayment(opts: {
    userId: string
    subscriptionId?: string
    amount: number
    currency: string
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
    providerReference: string
    stripeSessionId?: string
  }): Promise<Payment> {
    // Idempotency check
    const existing = await prisma.payment.findFirst({
      where: { providerReference: opts.providerReference },
    })
    if (existing) {
      logger.info({ providerReference: opts.providerReference }, 'Payment already recorded — skip')
      return existing
    }

    return prisma.payment.create({ data: opts })
  },
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function _fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, subscriptionId } = session.metadata ?? {}
  if (!userId || !subscriptionId) {
    logger.error({ sessionId: session.id }, 'Stripe session missing metadata')
    return
  }

  // Idempotency via providerReference
  const existing = await prisma.payment.findFirst({
    where: { providerReference: session.id },
  })
  if (existing && existing.status === 'SUCCEEDED') {
    logger.info({ sessionId: session.id }, 'Already fulfilled — skip')
    return
  }

  await prisma.payment.upsert({
    where: { providerReference: session.id },
    create: {
      userId,
      subscriptionId,
      stripeSessionId: session.id,
      amount: session.amount_total ?? 0,
      currency: session.currency?.toUpperCase() ?? 'XOF',
      status: 'SUCCEEDED',
      providerReference: session.id,
    },
    update: { status: 'SUCCEEDED' },
  })

  await subscriptionService.activateSubscription(subscriptionId)
  logger.info({ subscriptionId, userId }, 'Subscription activated via Stripe webhook')
}
