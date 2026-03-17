/**
 * Integration tests for Kkiapay payment webhook.
 * Verifies HMAC-SHA256 signature validation and idempotent processing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyWebhookSignature, handleWebhook } from '../../server/services/payments.service'
import crypto from 'crypto'

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    transaction: { findUnique: vi.fn(), create: vi.fn() },
    paymentOrder: { findUnique: vi.fn(), update: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    subscription: { create: vi.fn() },
  },
}))
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

  it('uses default 30-day validity when plan has no validityDays', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null) // plan not found
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_ok', reference: 'order-success', amount: 15000, currency: 'XOF', status: 'success' },
    }

    const result = await handleWebhook(envelope as any, envelope)

    expect(result).toMatchObject({ processed: true })
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce()
    const subData = mockPrisma.subscription.create.mock.calls[0][0].data
    // expiresAt should be ~30 days from now
    const diffDays = (subData.expiresAt.getTime() - Date.now()) / 86400000
    expect(diffDays).toBeGreaterThan(29)
    expect(diffDays).toBeLessThan(31)
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
