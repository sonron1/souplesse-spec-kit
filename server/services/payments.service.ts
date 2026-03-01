import { prisma } from '../utils/prisma'
import type { KkiapayWebhookEnvelopeType } from '../validators/payments.schemas'
import crypto from 'crypto'

const KKIAPAY_API_BASE = process.env.KKIAPAY_API_BASE || 'https://api.kkiapay.me'
const KKIAPAY_SECRET_KEY = process.env.KKIAPAY_SECRET_KEY

export async function createPaymentOrder(opts: { userId: string; subscriptionPlanId: string }) {
  const { userId, subscriptionPlanId } = opts

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
  if (!plan) throw new Error('SubscriptionPlan not found')

  const amount = plan.priceSingle
  const currency = 'XOF'

  const order = await prisma.paymentOrder.create({
    data: {
      userId,
      subscriptionPlanId,
      amount,
      currency,
      status: 'pending',
    },
  })

  // If secret key available, call Kkiapay to create an order, otherwise return a mock token (for tests)
  if (KKIAPAY_SECRET_KEY) {
    const payload = {
      amount,
      currency,
      reference: order.id,
      // optional metadata
      metadata: { userId, subscriptionPlanId },
    }

    const res = await fetch(`${KKIAPAY_API_BASE}/v1/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KKIAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Kkiapay order creation failed: ${res.status} ${text}`)
    }

    const body = await res.json()
    const token = body.data?.token || body.token || null

    const updated = await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { kkiapayOrderToken: token },
    })

    return { order: updated, kkiapayToken: token }
  }

  // mock token for local/dev/test
  const mockToken = `mock-token-${order.id}`
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { kkiapayOrderToken: mockToken },
  })

  return { order, kkiapayToken: mockToken }
}

export async function verifyWebhookSignature(rawBody: string, signatureHeader?: string) {
  const secret = process.env.KKIAPAY_WEBHOOK_SECRET
  if (!secret) return false
  if (!signatureHeader) return false

  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // constant-time compare
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader))
  } catch (e) {
    return false
  }
}

export async function handleWebhook(
  envelope: KkiapayWebhookEnvelopeType,
  rawPayload: Record<string, unknown>
) {
  const event = envelope.event
  const data = envelope.data

  // assume data contains paymentId and reference (our order id)
  const paymentId = data.id || data.paymentId || data.payment_id
  const reference =
    data.reference ||
    data.metadata?.reference ||
    data.metadata?.orderReference ||
    data.meta?.reference
  const amount = typeof data.amount === 'number' ? data.amount : data.amountCents || null
  const currency = data.currency || null

  if (!paymentId) throw new Error('Missing paymentId in webhook payload')
  if (!reference) throw new Error('Missing reference/order id in webhook payload')

  // Idempotency: if transaction with this paymentId exists, ignore
  const existingTx = await prisma.transaction.findUnique({ where: { paymentId } })
  if (existingTx) return { ignored: true }

  // find PaymentOrder by reference (assuming reference === PaymentOrder.id)
  const paymentOrder = await prisma.paymentOrder.findUnique({ where: { id: reference } })

  const tx = await prisma.transaction.create({
    data: {
      paymentOrderId: paymentOrder ? paymentOrder.id : 'unknown',
      paymentId,
      eventType: event,
      status: data.status || 'unknown',
      amount: amount ?? 0,
      currency: currency ?? 'XOF',
      rawPayload: rawPayload,
    },
  })

  if (
    paymentOrder &&
    (data.status === 'success' || data.status === 'paid' || event === 'payment.succeeded')
  ) {
    await prisma.paymentOrder.update({ where: { id: paymentOrder.id }, data: { status: 'paid' } })
    // activate subscription for user: create Subscription using plan validity
    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: paymentOrder.subscriptionPlanId },
      })
      const now = new Date()
      const expiresAt = new Date(now)
      if (plan && typeof plan.validityDays === 'number') {
        expiresAt.setDate(expiresAt.getDate() + plan.validityDays)
      } else {
        // default to 30 days
        expiresAt.setDate(expiresAt.getDate() + 30)
      }

      await prisma.subscription.create({
        data: {
          userId: paymentOrder.userId,
          subscriptionPlanId: paymentOrder.subscriptionPlanId,
          status: 'ACTIVE',
          isActive: true,
          activationDate: now,
          startsAt: now,
          expiresAt,
        },
      })
    } catch (e) {
      // log and continue; subscription creation failure shouldn't crash webhook processing
      console.error('Failed to create subscription after payment', e)
    }
  } else if (paymentOrder && (data.status === 'failed' || event === 'payment.failed')) {
    await prisma.paymentOrder.update({ where: { id: paymentOrder.id }, data: { status: 'failed' } })
  }

  return { processed: true, tx }
}

export default { createPaymentOrder, verifyWebhookSignature, handleWebhook }
