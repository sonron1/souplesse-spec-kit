import { prisma } from '../utils/prisma'
import { Prisma } from '@prisma/client'
import type { Subscription } from '.prisma/client'
import type { KkiapayWebhookEnvelopeType } from '../validators/payments.schemas'
import crypto from 'crypto'
import { kkiapay } from '@kkiapay-org/nodejs-sdk'
import logger from '../utils/logger'

// ─── Serializable retry ───────────────────────────────────────────────────────
const MAX_TX_RETRIES = 3

/**
 * Run `fn` up to MAX_TX_RETRIES times, retrying on Prisma P2034
 * (serialization failure / concurrent transaction conflict).
 */
async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (e) {
      if (
        attempt < MAX_TX_RETRIES &&
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2034'
      ) {
        attempt++
        logger.warn({ attempt, code: e.code }, '[withSerializableRetry] Serialization failure — retrying')
        continue
      }
      throw e
    }
  }
}

const _isSandbox = (process.env.NUXT_PUBLIC_KKIAPAY_IS_SANDBOX || '').trim().toLowerCase() === 'true'

function getKkiapayClient() {
  return kkiapay({
    privatekey: (process.env.KKIAPAY_SECRET_KEY || '').trim(),
    publickey: (process.env.NUXT_PUBLIC_KKIAPAY_PUBLIC_KEY || '').trim(),
    secretkey: (process.env.KKIAPAY_WEBHOOK_SECRET || '').trim(),
    sandbox: _isSandbox,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a PlanType string to the correct SubscriptionType enum value. */
function planTypeToSubscriptionType(planType: string): 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' {
  if (planType.includes('QUARTERLY')) return 'QUARTERLY'
  if (planType.includes('ANNUAL')) return 'ANNUAL'
  return 'MONTHLY'
}

// ─── Shared activation helper ─────────────────────────────────────────────────

/**
 * Activate a subscription for a SINGLE user within an already-open Prisma
 * interactive transaction.
 *
 * Guarantees:
 *   • Single-active invariant: all existing ACTIVE subs are deactivated first.
 *   • Cumulation (K001-K002): if the user already has an ACTIVE sub for the
 *     same plan, the new expiry extends from the old one instead of from now.
 *
 * The `partnerUserId` arg is stored as a forward reference on the created sub
 * (bidirectional couple fix) but does NOT trigger partner activation here —
 * callers handle the partner independently so failures can be caught separately.
 *
 * MUST be called inside a prisma.$transaction() callback.
 */
async function _activateForUserTx(
  tx: Prisma.TransactionClient,
  opts: {
    userId: string
    subscriptionPlanId: string
    plan: { validityDays: number; maxReports: number }
    partnerUserId?: string    // stored as forward reference on the created sub
    now: Date
  },
): Promise<{ sub: Subscription; extended: boolean }> {
  const { userId, subscriptionPlanId, plan, partnerUserId, now } = opts

  const existingActive = await tx.subscription.findFirst({
    where: { userId, subscriptionPlanId, status: 'ACTIVE', isActive: true },
    orderBy: { expiresAt: 'desc' },
  })

  await tx.subscription.updateMany({
    where: { userId, status: 'ACTIVE', isActive: true },
    data: { status: 'EXPIRED', isActive: false },
  })

  const baseDate = existingActive?.expiresAt && existingActive.expiresAt > now
    ? existingActive.expiresAt
    : now
  const expiresAt = new Date(baseDate.getTime() + plan.validityDays * 86_400_000)

  const sub = await tx.subscription.create({
    data: {
      userId,
      subscriptionPlanId,
      partnerUserId: partnerUserId ?? null,
      type: planTypeToSubscriptionType(plan.planType ?? ''),
      status: 'ACTIVE',
      isActive: true,
      activationDate: now,
      startsAt: now,
      expiresAt,
      maxReports: plan.maxReports,
    },
  })

  return { sub, extended: !!existingActive }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createPaymentOrder(opts: {
  userId: string
  subscriptionPlanId: string
  partnerUserId?: string
}) {
  const { userId, subscriptionPlanId, partnerUserId } = opts

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
  if (!plan) throw new Error('SubscriptionPlan not found')

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

  const kkiapaySecretKey = (process.env.KKIAPAY_SECRET_KEY || '').trim()
  const kkiapayApiBase = _isSandbox ? 'https://api-sandbox.kkiapay.me' : 'https://api.kkiapay.me'
  if (kkiapaySecretKey) {
    const payload = {
      amount,
      currency,
      reference: order.id,
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
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader))
  } catch {
    return false
  }
}

export async function handleWebhook(
  envelope: KkiapayWebhookEnvelopeType,
  rawPayload: Record<string, unknown>,
) {
  const event = envelope.event
  const data = envelope.data

  const paymentId = data.id || data.paymentId || data.payment_id
  const reference =
    data.reference ||
    data.metadata?.reference ||
    data.metadata?.orderReference ||
    data.meta?.reference
  const amount = typeof data.amount === 'number' ? data.amount : (data.amountCents ?? null)
  const currency = data.currency ?? null

  if (!paymentId) throw new Error('Missing paymentId in webhook payload')
  if (!reference) throw new Error('Missing reference/order id in webhook payload')

  const existingTx = await prisma.transaction.findUnique({ where: { paymentId } })
  if (existingTx) {
    logger.info({ paymentId }, '[handleWebhook] paymentId already processed — returning 200 immediately')
    return { ignored: true }
  }

  const paymentOrder = await prisma.paymentOrder.findUnique({ where: { id: reference } })

  // Fix #5: catch DB-level unique violation on paymentId (concurrent webhooks)
  let tx: Awaited<ReturnType<typeof prisma.transaction.create>>
  try {
    tx = await prisma.transaction.create({
      data: {
        paymentOrderId: paymentOrder ? paymentOrder.id : 'unknown',
        paymentId,
        eventType: event,
        status: data.status || 'unknown',
        amount: amount ?? 0,
        currency: currency ?? 'XOF',
        rawPayload,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      logger.warn({ paymentId }, '[handleWebhook] Duplicate paymentId — webhook already processed, returning 200')
      return { ignored: true }
    }
    throw e
  }

  if (
    paymentOrder &&
    (data.status === 'success' || data.status === 'paid' || event === 'payment.succeeded')
  ) {
    logger.info({ paymentOrderId: paymentOrder.id, event }, '[handleWebhook] Payment successful — activating subscription')
    await prisma.paymentOrder.update({ where: { id: paymentOrder.id }, data: { status: 'paid' } })

    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: paymentOrder.subscriptionPlanId },
      })
      if (!plan) throw new Error(`SubscriptionPlan ${paymentOrder.subscriptionPlanId} not found`)

      const now = new Date()
      const partnerUserId = paymentOrder.partnerUserId ?? undefined

      // Buyer activation (atomic, serializable to guard single-active invariant)
      await withSerializableRetry(() =>
        prisma.$transaction(
          async (prismaT) => {
            await _activateForUserTx(prismaT, {
              userId: paymentOrder.userId,
              subscriptionPlanId: paymentOrder.subscriptionPlanId,
              plan,
              partnerUserId,
              now,
            })
          },
          { isolationLevel: 'Serializable' },
        ),
      )
      logger.info({ paymentOrderId: paymentOrder.id, userId: paymentOrder.userId }, '[handleWebhook] Buyer subscription activated')

      // Partner activation (best-effort — failure must not block webhook ack)
      if (partnerUserId) {
        try {
          await withSerializableRetry(() =>
            prisma.$transaction(
              async (prismaT) => {
                // Re-check partner couple status inside the serializable snapshot
                const existingCoupleSub = await prismaT.subscription.findFirst({
                  where: { userId: partnerUserId, isActive: true, partnerUserId: { not: null } },
                })
                if (existingCoupleSub) {
                  logger.warn(
                    { partnerUserId, existingSubId: existingCoupleSub.id },
                    '[handleWebhook] Partner already in active couple sub at activation time — skipping',
                  )
                  return
                }
                await _activateForUserTx(prismaT, {
                  userId: partnerUserId,
                  subscriptionPlanId: paymentOrder.subscriptionPlanId,
                  plan,
                  partnerUserId: paymentOrder.userId,
                  now,
                })
              },
              { isolationLevel: 'Serializable' },
            ),
          )
          logger.info({ partnerUserId, paymentOrderId: paymentOrder.id }, '[handleWebhook] Partner subscription activated')
        } catch (e) {
          logger.error(
            { err: e, partnerUserId, paymentOrderId: paymentOrder.id },
            '[handleWebhook] Failed to activate partner subscription (non-fatal)',
          )
          // Fix #2: notify admins of asymmetric couple activation
          try {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
            await prisma.notification.createMany({
              data: admins.map((a) => ({
                userId: a.id,
                type: 'COUPLE_ACTIVATION_FAILED',
                title: 'Activation couple échouée (webhook)',
                body: `L'abonnement couple n'a pas pu être activé pour le partenaire (userId: ${partnerUserId}, order: ${paymentOrder.id}). Vérifiez manuellement.`,
              })),
            })
          } catch (notifyErr) {
            logger.error({ notifyErr }, '[handleWebhook] Failed to notify admins of partner activation failure')
          }
        }
      }
    } catch (e) {
      logger.error(
        { err: e, paymentOrderId: paymentOrder.id },
        '[handleWebhook] Failed to activate subscription after payment',
      )
    }
  } else if (paymentOrder && (data.status === 'failed' || event === 'payment.failed')) {
    logger.info({ paymentOrderId: paymentOrder.id, event }, '[handleWebhook] Payment failed — order marked failed')
    await prisma.paymentOrder.update({ where: { id: paymentOrder.id }, data: { status: 'failed' } })
  }

  return { processed: true, tx }
}

export async function confirmPayment(opts: {
  userId: string
  transactionId: string
  subscriptionPlanId: string
  partnerUserId?: string
}) {
  const { userId, transactionId, subscriptionPlanId, partnerUserId } = opts

  // Idempotency: if this transactionId was already confirmed, return existing sub
  const existing = await prisma.payment.findUnique({
    where: { kkiapayTransactionId: transactionId },
  })
  if (existing) {
    logger.info({ transactionId, userId }, '[confirmPayment] Idempotent hit — transaction already processed, returning existing sub')
    const sub = await prisma.subscription.findFirst({
      where: { userId, subscriptionPlanId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return { subscriptionId: sub?.id ?? null, extended: false }
  }

  // Verify transaction with KKiaPay SDK — HTTP call OUTSIDE any transaction
  const k = getKkiapayClient()
  let verifyData: Record<string, unknown>
  try {
    verifyData = (await k.verify(transactionId)) as Record<string, unknown>
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error(
      { transactionId, sandbox: _isSandbox, err: msg },
      '[confirmPayment] KKiaPay verify failed',
    )
    throw new Error(`KKiaPay verification failed: ${msg}`)
  }

  const status = (verifyData?.status ?? '').toString().toUpperCase()
  logger.info({ transactionId, status, sandbox: _isSandbox }, '[confirmPayment] KKiaPay transaction status')

  if (!['SUCCESS', 'SUCCESSFUL', 'COMPLETE', 'COMPLETED', 'PAID'].includes(status)) {
    throw new Error(`Transaction not successful: ${status} — ${JSON.stringify(verifyData)}`)
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
  if (!plan) throw new Error('SubscriptionPlan not found')

  const amount: number =
    typeof verifyData?.amount === 'number' ? verifyData.amount : plan.priceSingle
  const now = new Date()

  // ── Step 1: Atomic — buyer payment record + buyer subscription ────────────
  let subscriptionId: string
  let extended: boolean

  try {
    const result = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.create({
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

          const { sub: main, extended: ext } = await _activateForUserTx(tx, {
            userId,
            subscriptionPlanId,
            plan,
            partnerUserId,       // stored as forward reference on main sub
            now,
          })

          await tx.payment.update({
            where: { id: payment.id },
            data: { subscriptionId: main.id },
          })

          return { subscriptionId: main.id, extended: ext }
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    subscriptionId = result.subscriptionId
    extended = result.extended
    logger.info({ subscriptionId, extended, userId }, '[confirmPayment] Buyer subscription activated')
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      logger.warn(
        { transactionId, userId },
        '[confirmPayment] Duplicate transactionId — returning existing subscription',
      )
      const sub = await prisma.subscription.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      })
      return { subscriptionId: sub?.id ?? null, extended: false }
    }
    throw e
  }

  // ── Step 2: Best-effort — couple partner subscription ────────────────────
  // Intentionally outside the buyer's transaction: partner failure must never
  // roll back an already-confirmed buyer payment.
  if (partnerUserId) {
    try {
      await withSerializableRetry(() =>
        prisma.$transaction(
          async (tx) => {
            // Re-check partner couple status inside the serializable snapshot
            const existingCoupleSub = await tx.subscription.findFirst({
              where: { userId: partnerUserId, isActive: true, partnerUserId: { not: null } },
            })
            if (existingCoupleSub) {
              logger.warn(
                { partnerUserId, existingSubId: existingCoupleSub.id },
                '[confirmPayment] Partner already in active couple sub at activation time — skipping',
              )
              return
            }
            await _activateForUserTx(tx, {
              userId: partnerUserId,
              subscriptionPlanId,
              plan,
              partnerUserId: userId,  // back-reference to main subscriber
              now,
            })
          },
          { isolationLevel: 'Serializable' },
        ),
      )
      logger.info({ partnerUserId, userId }, '[confirmPayment] Partner subscription activated')
    } catch (e) {
      logger.error(
        { err: e, partnerUserId },
        '[confirmPayment] Failed to create/extend partner subscription (non-fatal)',
      )
      // Fix #2: notify admins of asymmetric couple activation so they can fix it manually
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: 'COUPLE_ACTIVATION_FAILED',
            title: 'Activation couple échouée',
            body: `L'abonnement couple n'a pas pu être activé pour le partenaire (userId: ${partnerUserId}). L'acheteur (userId: ${userId}) a bien un abonnement actif. Vérifiez manuellement.`,
          })),
        })
      } catch (notifyErr) {
        logger.error({ notifyErr }, '[confirmPayment] Failed to notify admins of partner activation failure')
      }
    }
  }

  return { subscriptionId, extended }
}

export default { createPaymentOrder, verifyWebhookSignature, handleWebhook, confirmPayment }
