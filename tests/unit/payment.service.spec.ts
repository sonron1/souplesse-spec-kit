import { describe, it, expect, vi, beforeEach } from 'vitest'
import { paymentService } from '../../server/services/payment.service'
import { subscriptionService } from '../../server/services/subscription.service'

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }
  return { default: vi.fn(() => mockStripe) }
})

vi.mock('../../server/utils/prisma', () => ({
  default: {
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('../../server/services/subscription.service', () => ({
  subscriptionService: {
    activateSubscription: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import prisma from '../../server/utils/prisma'
const mockPrisma = vi.mocked(prisma)

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock'
  })

  describe('createStripeSession', () => {
    it('creates a Stripe session and records a PENDING payment', async () => {
      mockPrisma.payment.create.mockResolvedValue({} as never)

      const result = await paymentService.createStripeSession({
        userId: 'user-1',
        subscriptionId: 'sub-1',
        planId: 'plan-1',
        amount: 5000,
        currency: 'XOF',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      expect(result.sessionId).toBe('cs_test_123')
      expect(result.url).toContain('checkout.stripe.com')
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
      )
    })
  })

  describe('recordPayment', () => {
    it('records a new payment when providerReference is unique', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null)
      const mockPayment = { id: 'pay-1', providerReference: 'ref-abc' } as never
      mockPrisma.payment.create.mockResolvedValue(mockPayment)

      const result = await paymentService.recordPayment({
        userId: 'user-1',
        amount: 5000,
        currency: 'XOF',
        status: 'SUCCEEDED',
        providerReference: 'ref-abc',
      })

      expect(result).toBe(mockPayment)
      expect(mockPrisma.payment.create).toHaveBeenCalledOnce()
    })

    it('is idempotent — returns existing payment if providerReference already exists', async () => {
      const existing = { id: 'pay-existing', status: 'SUCCEEDED' } as never
      mockPrisma.payment.findFirst.mockResolvedValue(existing)

      const result = await paymentService.recordPayment({
        userId: 'user-1',
        amount: 5000,
        currency: 'XOF',
        status: 'SUCCEEDED',
        providerReference: 'ref-abc',
      })

      expect(result).toBe(existing)
      expect(mockPrisma.payment.create).not.toHaveBeenCalled()
    })
  })
})
