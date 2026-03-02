import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../server/utils/prisma', () => {
  return {
    prisma: {
      subscriptionPlan: { findUnique: vi.fn() },
      paymentOrder: { findUnique: vi.fn(), update: vi.fn() },
      transaction: { findUnique: vi.fn(), create: vi.fn() },
      subscription: { create: vi.fn(), findFirst: vi.fn() },
      payment: { findUnique: vi.fn(), create: vi.fn() },
    },
  }
})

import { handleWebhook, confirmPayment } from '../server/services/payments.service'
import { prisma } from '../server/utils/prisma'

describe('payments webhook handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates subscription when payment succeeded', async () => {
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_123', status: 'paid', reference: 'order1', amount: 5000, currency: 'XOF' },
    }

    ;(prisma.transaction.findUnique as any).mockResolvedValue(null)
    ;(prisma.paymentOrder.findUnique as any).mockResolvedValue({
      id: 'order1',
      userId: 'user1',
      subscriptionPlanId: 'plan1',
    })
    ;(prisma.subscriptionPlan.findUnique as any).mockResolvedValue({
      id: 'plan1',
      validityDays: 30,
    })

    const res = await handleWebhook(envelope as any, envelope)
    expect(prisma.transaction.create).toHaveBeenCalled()
    expect(prisma.subscription.create).toHaveBeenCalled()
    expect(res.processed).toBe(true)
  })

  // SC-002: duplicate webhooks must not create duplicate subscriptions
  it('is idempotent — duplicate webhook with same paymentId returns ignored', async () => {
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_dup', status: 'paid', reference: 'order2', amount: 5000, currency: 'XOF' },
    }

    // Simulate existing transaction record for this paymentId
    ;(prisma.transaction.findUnique as any).mockResolvedValue({ id: 'tx_existing', paymentId: 'pay_dup' })

    const res = await handleWebhook(envelope as any, envelope)

    // Must NOT create another transaction or subscription
    expect(prisma.transaction.create).not.toHaveBeenCalled()
    expect(prisma.subscription.create).not.toHaveBeenCalled()
    expect((res as any).ignored).toBe(true)
  })
})

describe('confirmPayment idempotency (SC-002)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.KKIAPAY_SECRET_KEY = 'test-secret'
  })

  it('returns existing subscription when transactionId already recorded', async () => {
    // Payment record already exists for this transactionId
    ;(prisma.payment.findUnique as any).mockResolvedValue({
      id: 'pay1',
      kkiapayTransactionId: 'tx_already_used',
    })
    ;(prisma.subscription.findFirst as any).mockResolvedValue({
      id: 'sub_existing',
      isActive: true,
    })

    const result = await confirmPayment({
      userId: 'user1',
      transactionId: 'tx_already_used',
      subscriptionPlanId: 'plan1',
    })

    // Must NOT create a new payment or subscription
    expect(prisma.payment.create).not.toHaveBeenCalled()
    expect(prisma.subscription.create).not.toHaveBeenCalled()
    expect(result.subscriptionId).toBe('sub_existing')
  })

  it('returns null subscriptionId when payment exists but subscription is missing', async () => {
    ;(prisma.payment.findUnique as any).mockResolvedValue({ id: 'pay2', kkiapayTransactionId: 'tx_orphan' })
    ;(prisma.subscription.findFirst as any).mockResolvedValue(null)

    const result = await confirmPayment({
      userId: 'user1',
      transactionId: 'tx_orphan',
      subscriptionPlanId: 'plan1',
    })

    expect(prisma.payment.create).not.toHaveBeenCalled()
    expect(result.subscriptionId).toBeNull()
  })
})
