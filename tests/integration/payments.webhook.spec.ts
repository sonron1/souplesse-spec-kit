/**
 * Integration tests for Kkiapay payment webhook.
 * Verifies HMAC-SHA256 signature validation and idempotent processing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyWebhookSignature, handleWebhook } from '../../server/services/payments.service'
import crypto from 'crypto'

vi.mock('../../server/utils/prisma', () => {
  const inst: Record<string, any> = {
    transaction: { findUnique: vi.fn(), create: vi.fn() },
    paymentOrder: { findUnique: vi.fn(), update: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    subscription: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  }
  inst.$transaction = vi.fn().mockImplementation((cb: (tx: any) => Promise<any>) => cb(inst))
  return { prisma: inst }
})
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'
const mockPrisma = vi.mocked(prisma) as any

const SECRET = 'test_webhook_secret'

function makeSignature(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex')
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.KKIAPAY_WEBHOOK_SECRET = SECRET
  // Restore $transaction after clearAllMocks wipes its implementation
  mockPrisma.$transaction.mockImplementation((cb: (tx: any) => Promise<any>) => cb(mockPrisma))
  // Default helpers used inside _activateForUserTx
  mockPrisma.subscription.findFirst.mockResolvedValue(null)
  mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 })
})

describe('verifyWebhookSignature', () => {
  it('returns true for a valid HMAC-SHA256 signature', async () => {
    const body = JSON.stringify({ event: 'payment.succeeded', data: { id: 'pay_1' } })
    const sig = makeSignature(body)
    const result = await verifyWebhookSignature(body, sig)
    expect(result).toBe(true)
  })

  it('returns false for an invalid signature', async () => {
    const body = JSON.stringify({ event: 'payment.succeeded', data: { id: 'pay_1' } })
    const result = await verifyWebhookSignature(body, 'bad-sig')
    expect(result).toBe(false)
  })

  it('returns false when no signature provided', async () => {
    const body = JSON.stringify({ event: 'payment.succeeded', data: { id: 'pay_1' } })
    const result = await verifyWebhookSignature(body, undefined)
    expect(result).toBe(false)
  })
})

describe('handleWebhook — idempotency', () => {
  it('ignores duplicate paymentId (idempotent)', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({
      id: 'tx-1',
      paymentId: 'pay_dup',
    } as never)

    const envelope = {
      event: 'payment.succeeded',
      data: {
        id: 'pay_dup',
        reference: 'order-1',
        amount: 5000,
        currency: 'XOF',
        status: 'success',
      },
    }
    const result = await handleWebhook(envelope as any, envelope)
    expect(result).toMatchObject({ ignored: true })
  })

  it('returns { ignored: true } on P2002 duplicate paymentId (concurrent webhooks)', async () => {
    // Simulate two concurrent requests: findUnique returns null but create throws P2002
    const { Prisma } = await import('@prisma/client')
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '5.0.0',
    })

    mockPrisma.transaction.findUnique.mockResolvedValue(null)
    mockPrisma.paymentOrder.findUnique.mockResolvedValue({ id: 'order-1', userId: 'u', subscriptionPlanId: 'p', partnerUserId: null, status: 'pending' })
    mockPrisma.transaction.create = vi.fn().mockRejectedValue(p2002)

    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_concurrent', reference: 'order-1', amount: 5000, currency: 'XOF', status: 'success' },
    }

    const result = await handleWebhook(envelope as any, envelope)
    expect(result).toMatchObject({ ignored: true })
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
  })
})

describe('handleWebhook — success path', () => {
  const ORDER = {
    id: 'order-success',
    userId: 'user-1',
    subscriptionPlanId: 'plan-1',
    partnerUserId: null,
    status: 'pending',
  }
  const PLAN = { id: 'plan-1', validityDays: 30 }
  const CREATED_TX = { id: 'tx-new', paymentId: 'pay_ok' }
  const CREATED_SUB = { id: 'sub-new' }

  beforeEach(() => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null)
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(ORDER)
    mockPrisma.transaction.create = vi.fn().mockResolvedValue(CREATED_TX)
    mockPrisma.paymentOrder.update = vi.fn().mockResolvedValue({ ...ORDER, status: 'paid' })
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(PLAN)
    mockPrisma.subscription.create = vi.fn().mockResolvedValue(CREATED_SUB)
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 })
  })

  it('creates subscription and marks order paid on payment.succeeded', async () => {
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_ok', reference: 'order-success', amount: 15000, currency: 'XOF', status: 'success' },
    }

    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'paid' } })
    )
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce()
    expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE', isActive: true }),
      })
    )
  })

  it('silently skips activation and still returns processed when plan is not found', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null) // plan not found
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_ok', reference: 'order-success', amount: 15000, currency: 'XOF', status: 'success' },
    }

    // plan not found → throws inside try/catch → silently caught → still returns processed
    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    // Subscription was not activated because the plan lookup failed
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
  })

  it('activates subscription when data.status is "paid" (alternate status value)', async () => {
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_paid', reference: 'order-success', amount: 15000, currency: 'XOF', status: 'paid' },
    }

    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'paid' } })
    )
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce()
  })

  it('creates transaction but skips activation when paymentOrder is not found', async () => {
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(null) // unknown reference
    mockPrisma.transaction.create = vi.fn().mockResolvedValue({ id: 'tx-noorder', paymentId: 'pay_noorder' })

    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_noorder', reference: 'unknown-ref', amount: 5000, currency: 'XOF', status: 'success' },
    }

    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    expect(mockPrisma.transaction.create).toHaveBeenCalledOnce()
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    expect(mockPrisma.paymentOrder.update).not.toHaveBeenCalled()
  })

  it('creates partner subscription when partnerUserId is set', async () => {
    const orderWithPartner = { ...ORDER, partnerUserId: 'partner-2' }
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(orderWithPartner)

    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_ok', reference: 'order-success', amount: 25000, currency: 'XOF', status: 'success' },
    }

    await handleWebhook(envelope as any, envelope)

    expect(mockPrisma.subscription.create).toHaveBeenCalledTimes(2)
    const partnerCall = mockPrisma.subscription.create.mock.calls.find(
      (c: any[]) => c[0].data.userId === 'partner-2'
    )
    expect(partnerCall).toBeDefined()
    expect(partnerCall![0].data.partnerUserId).toBe('user-1')
  })
})

describe('handleWebhook — failure path', () => {
  it('marks order as failed on payment.failed event', async () => {
    const order = { id: 'order-fail', userId: 'user-1', subscriptionPlanId: 'plan-1', partnerUserId: null, status: 'pending' }
    mockPrisma.transaction.findUnique.mockResolvedValue(null)
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(order)
    mockPrisma.transaction.create = vi.fn().mockResolvedValue({ id: 'tx-fail' })
    mockPrisma.paymentOrder.update = vi.fn().mockResolvedValue({ ...order, status: 'failed' })

    const envelope = {
      event: 'payment.failed',
      data: { id: 'pay_fail', reference: 'order-fail', amount: 15000, currency: 'XOF', status: 'failed' },
    }

    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } })
    )
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
  })
})

describe('handleWebhook — missing fields', () => {
  it('throws when paymentId is missing', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null)
    const envelope = {
      event: 'payment.succeeded',
      data: { reference: 'order-1', amount: 5000, currency: 'XOF', status: 'success' },
    }

    await expect(handleWebhook(envelope as any, envelope)).rejects.toThrow(/paymentId/)
  })

  it('throws when reference is missing', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null)
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_nref', amount: 5000, currency: 'XOF', status: 'success' },
    }

    await expect(handleWebhook(envelope as any, envelope)).rejects.toThrow(/reference/)
  })
})

describe('handleWebhook — error catch paths', () => {
  const ORDER = {
    id: 'order-catch',
    userId: 'user-1',
    subscriptionPlanId: 'plan-1',
    partnerUserId: null,
    status: 'pending',
  }
  const PLAN = { id: 'plan-1', validityDays: 30 }

  beforeEach(() => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null)
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(ORDER)
    mockPrisma.transaction.create = vi.fn().mockResolvedValue({ id: 'tx-catch' })
    mockPrisma.paymentOrder.update = vi.fn().mockResolvedValue({ ...ORDER, status: 'paid' })
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(PLAN)
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 })
  })

  it('silently catches subscription creation failure (logs, does not throw)', async () => {
    mockPrisma.subscription.create = vi.fn().mockRejectedValue(new Error('DB constraint error'))
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_sub_fail', reference: 'order-catch', amount: 15000, currency: 'XOF', status: 'success' },
    }

    // Should not throw — the outer catch swallows the error
    const result = await handleWebhook(envelope as any, envelope)
    expect(result).toMatchObject({ processed: true })
  })

  it('skips partner when partner already has active couple sub (race condition)', async () => {
    const orderWithPartner = { ...ORDER, partnerUserId: 'partner-race' }
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(orderWithPartner)
    // First findFirst: buyer cumulation check → null
    // Second findFirst: partner couple conflict check → found existing couple sub
    mockPrisma.subscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-couple', isActive: true, partnerUserId: 'buyer-x' })
    mockPrisma.subscription.create = vi.fn().mockResolvedValue({ id: 'sub-buyer-only' })

    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_race', reference: 'order-success', amount: 25000, currency: 'XOF', status: 'success' },
    }

    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    // Only buyer sub created — partner skipped
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce()
    expect(mockPrisma.subscription.create.mock.calls[0][0].data.userId).toBe('user-1')

    const logger = (await import('../../server/utils/logger')).default
    expect(vi.mocked(logger).warn).toHaveBeenCalledWith(
      expect.objectContaining({ partnerUserId: 'partner-race' }),
      expect.stringContaining('Partner already in active couple sub'),
    )
  })

  it('silently catches partner subscription failure (logs, does not throw)', async () => {
    const orderWithPartner = { ...ORDER, partnerUserId: 'partner-x' }
    mockPrisma.paymentOrder.findUnique.mockResolvedValue(orderWithPartner)
    mockPrisma.subscription.create = vi.fn()
      .mockResolvedValueOnce({ id: 'sub-main' })           // main sub succeeds
      .mockRejectedValueOnce(new Error('Partner DB error')) // partner sub fails

    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_partner_fail', reference: 'order-catch', amount: 25000, currency: 'XOF', status: 'success' },
    }

    // Should not throw — partner failure is caught silently
    const result = await handleWebhook(envelope as any, envelope)
    expect(result).toMatchObject({ processed: true })
  })
})
