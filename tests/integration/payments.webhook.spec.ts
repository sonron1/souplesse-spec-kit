/**
 * Integration tests for Kkiapay payment webhook.
 * Verifies HMAC-SHA256 signature validation and idempotent processing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyWebhookSignature, handleWebhook } from '../../server/services/payments.service'
import crypto from 'crypto'

vi.mock('../../server/utils/prisma', () => ({
  default: {
    transaction: { findUnique: vi.fn() },
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
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', paymentId: 'pay_dup' } as never)

    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_dup', reference: 'order-1', amount: 5000, currency: 'XOF', status: 'success' },
    }
    const result = await handleWebhook(envelope as any, envelope)
    expect(result).toMatchObject({ ignored: true })
  })
})
