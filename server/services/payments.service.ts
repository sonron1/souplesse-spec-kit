import { prisma } from '../utils/prisma'
import type { KkiapayWebhookEnvelopeType } from '../validators/payments.schemas'
import crypto from 'crypto'
import { kkiapay } from '@kkiapay-org/nodejs-sdk'

const _isSandbox = (process.env.NUXT_PUBLIC_KKIAPAY_IS_SANDBOX || '').trim().toLowerCase() === 'true'

function getKkiapayClient() {
  return kkiapay({
    privatekey: (process.env.KKIAPAY_SECRET_KEY || '').trim(),
    publickey: (process.env.NUXT_PUBLIC_KKIAPAY_PUBLIC_KEY || '').trim(),
    secretkey: (process.env.KKIAPAY_WEBHOOK_SECRET || '').trim(),
    sandbox: _isSandbox,
  })
}

export async function createPaymentOrder(opts: { userId: string; subscriptionPlanId: string; partnerUserId?: string }) {
  const { userId, subscriptionPlanId, partnerUserId } = opts

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
  if (!plan) throw new Error('SubscriptionPlan not found')

  // For couple plans, use priceCouple if set; otherwise fall back to priceSingle
  const isCouplePlan = plan.planType?.includes('COUPLE') ?? false
  const amount = (isCouplePlan && plan.priceCouple != null) ? plan.priceCouple : plan.priceSingle
  const currency = 'XOF'

  const order = await prisma.paymentOrder.create({
    data: {
      userId,
      subscriptionPlanId,
      partnerUserId: partnerUserId ?? null,
      amount,
      currency,
      status: 'pending',
    },
  })

  // If secret key available, call Kkiapay to create an order, otherwise return a mock token (for tests)
  const kkiapaySecretKey = (process.env.KKIAPAY_SECRET_KEY || '').trim()
  const kkiapayApiBase = _isSandbox ? 'https://api-sandbox.kkiapay.me' : 'https://api.kkiapay.me'
  if (kkiapaySecretKey) {
    const payload = {
      amount,
      currency,
      reference: order.id,
      // optional metadata
      metadata: { userId, subscriptionPlanId },
    }

    const res = await fetch(`${kkiapayApiBase}/v1/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kkiapaySecretKey}`,
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
  const secret = (process.env.KKIAPAY_WEBHOOK_SECRET || '').trim()
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

      // FR-016: If couple plan has a partner, activate a subscription for them too
      if (paymentOrder.partnerUserId) {
        try {
          await prisma.subscription.create({
            data: {
              userId: paymentOrder.partnerUserId,
              subscriptionPlanId: paymentOrder.subscriptionPlanId,
              partnerUserId: paymentOrder.userId, // back-reference
              status: 'ACTIVE',
              isActive: true,
              activationDate: now,
              startsAt: now,
              expiresAt,
            },
          })
        } catch (e) {
          console.error('Failed to create partner subscription', e)
        }
      }
    } catch (e) {
      // log and continue; subscription creation failure shouldn't crash webhook processing
      console.error('Failed to create subscription after payment', e)
    }
  } else if (paymentOrder && (data.status === 'failed' || event === 'payment.failed')) {
    await prisma.paymentOrder.update({ where: { id: paymentOrder.id }, data: { status: 'failed' } })
  }

  return { processed: true, tx }
}

export default { createPaymentOrder, verifyWebhookSignature, handleWebhook, confirmPayment }

export async function confirmPayment(opts: {
  userId: string
  transactionId: string
  subscriptionPlanId: string
  partnerUserId?: string
}) {
  const { userId, transactionId, subscriptionPlanId, partnerUserId } = opts

  // Idempotency: if Payment with this transactionId already exists, return existing subscription
  const existing = await prisma.payment.findUnique({
    where: { kkiapayTransactionId: transactionId },
  })
  if (existing) {
    const sub = await prisma.subscription.findFirst({
      where: { userId, subscriptionPlanId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return { subscriptionId: sub?.id ?? null }
  }

  // Verify transaction with KKiaPay SDK
  const k = getKkiapayClient()
  let verifyData: Record<string, unknown>
  try {
    verifyData = await k.verify(transactionId) as Record<string, unknown>
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[confirmPayment] KKiaPay verify failed — sandbox=${_isSandbox} txId=${transactionId}: ${msg}`)
    throw new Error(`KKiaPay verification failed: ${msg}`)
  }

  const status: string = (verifyData?.status ?? '').toString().toUpperCase()
  console.log(`[confirmPayment] KKiaPay status="${status}" txId=${transactionId} sandbox=${_isSandbox}`)

  if (!['SUCCESS', 'SUCCESSFUL', 'COMPLETE', 'COMPLETED', 'PAID'].includes(status)) {
    throw new Error(`Transaction not successful: ${status} — ${JSON.stringify(verifyData)}`)
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
  if (!plan) throw new Error('SubscriptionPlan not found')

  const amount: number = typeof verifyData?.amount === 'number'
    ? verifyData.amount
    : plan.priceSingle

  // Record the payment with raw provider response (FR-007)
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount,
      currency: 'XOF',
      provider: 'kkiapay',
      kkiapayTransactionId: transactionId,
      status: 'CONFIRMED',
      rawPayload: verifyData as object,
    },
  })

  // Activate subscription
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + plan.validityDays)

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      subscriptionPlanId,
      type: 'MONTHLY',
      status: 'ACTIVE',
      isActive: true,
      activationDate: now,
      startsAt: now,
      expiresAt,
      payments: { connect: { id: payment.id } },
    },
  })

  // FR-016: activate partner subscription for couple plans
  if (partnerUserId) {
    try {
      await prisma.subscription.create({
        data: {
          userId: partnerUserId,
          subscriptionPlanId,
          partnerUserId: userId, // back-reference to primary subscriber
          type: 'MONTHLY',
          status: 'ACTIVE',
          isActive: true,
          activationDate: now,
          startsAt: now,
          expiresAt,
        },
      })
    } catch (e) {
      console.error('Failed to create partner subscription (confirmPayment)', e)
    }
  }

  return { subscriptionId: subscription.id }
}
