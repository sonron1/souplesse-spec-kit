/**
 * R003 — Unit tests for payments.service.ts:
 * - Subscription extension (cumul abonnement): confirmPayment extends expiresAt
 *   when an ACTIVE subscription for the same plan already exists.
 * - New subscription created when no active one exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@kkiapay-org/nodejs-sdk', () => ({
  kkiapay: vi.fn(() => ({
    verify: vi.fn().mockResolvedValue({ status: 'SUCCESS', amount: 15000 }),
  })),
}))

vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { confirmPayment } from '../../server/services/payments.service'
import { prisma } from '../../server/utils/prisma'

const mockPrisma = vi.mocked(prisma) as any

const MOCK_PLAN = {
  id: 'plan-1',
  name: 'Abonnement 1 mois',
  priceSingle: 15000,
  priceCouple: 25000,
  validityDays: 30,
}

const MOCK_PAYMENT = {
  id: 'payment-1',
  userId: 'user-1',
  amount: 15000,
  currency: 'XOF',
  provider: 'kkiapay',
  kkiapayTransactionId: 'tx-123',
  status: 'CONFIRMED',
}

const EXISTING_ACTIVE_SUB = {
  id: 'sub-existing',
  userId: 'user-1',
  subscriptionPlanId: 'plan-1',
  status: 'ACTIVE',
  isActive: true,
  expiresAt: new Date(Date.now() + 10 * 86400000), // expires in 10 days
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── K001/K002: extension instead of duplicate ─────────────────────────────
describe('confirmPayment — subscription extension (K001/K002)', () => {
  it('extends expiresAt when an ACTIVE subscription for the same plan exists', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)          // not yet processed
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst.mockResolvedValue(EXISTING_ACTIVE_SUB) // existing active
    const extendedSub = { ...EXISTING_ACTIVE_SUB, expiresAt: new Date(Date.now() + 40 * 86400000) }
    mockPrisma.subscription.update.mockResolvedValue(extendedSub)
    mockPrisma.subscription.findUnique.mockResolvedValue(extendedSub)

    const result = await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-123',
      subscriptionPlanId: 'plan-1',
    })

    expect(result.extended).toBe(true)
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXISTING_ACTIVE_SUB.id },
        data: expect.objectContaining({ expiresAt: expect.any(Date) }),
      })
    )
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
  })

  it('creates a new subscription when no active one exists', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst.mockResolvedValue(null) // no existing active sub
    const newSub = { id: 'sub-new', userId: 'user-1', status: 'ACTIVE', isActive: true, expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub)
    mockPrisma.subscription.findUnique.mockResolvedValue(newSub)

    const result = await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-456',
      subscriptionPlanId: 'plan-1',
    })

    expect(result.extended).toBe(false)
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce()
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled()
  })

  it('is idempotent — returns existing subscription when transaction already processed', async () => {
    const existingPayment = { id: 'payment-existing', kkiapayTransactionId: 'tx-dup' }
    mockPrisma.payment.findUnique.mockResolvedValue(existingPayment)
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-existing', isActive: true })

    const result = await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-dup',
      subscriptionPlanId: 'plan-1',
    })

    expect(result.subscriptionId).toBe('sub-existing')
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled()
  })

  it('activates a partner subscription when partnerUserId is provided', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst
      .mockResolvedValueOnce(null)  // no existing active sub for buyer
      .mockResolvedValueOnce(null)  // no existing active sub for partner
    const newSub = { id: 'sub-main', expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub)
    mockPrisma.subscription.findUnique.mockResolvedValue(newSub)

    await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-couple',
      subscriptionPlanId: 'plan-1',
      partnerUserId: 'partner-1',
    })

    // 2 subscription.create calls: one for buyer, one for partner
    expect(mockPrisma.subscription.create).toHaveBeenCalledTimes(2)
    expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'partner-1' }) })
    )
  })

  it('extends partner subscription if partner already has an active sub', async () => {
    const partnerSub = { id: 'partner-sub', expiresAt: new Date(Date.now() + 5 * 86400000) }
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst
      .mockResolvedValueOnce(null)      // no existing active for buyer
      .mockResolvedValueOnce(partnerSub) // partner has active sub
    const newSub = { id: 'sub-main', expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub)
    mockPrisma.subscription.update.mockResolvedValue(partnerSub)
    mockPrisma.subscription.findUnique.mockResolvedValue(newSub)

    await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-couple2',
      subscriptionPlanId: 'plan-1',
      partnerUserId: 'partner-1',
    })

    // partner sub was extended, not created
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'partner-sub' } })
    )
  })

  it('extends expiresAt by plan.validityDays from current expiresAt', async () => {
    const currentExpiry = new Date(Date.now() + 10 * 86400000)
    const subWithExpiry = { ...EXISTING_ACTIVE_SUB, expiresAt: currentExpiry }

    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst.mockResolvedValue(subWithExpiry)
    mockPrisma.subscription.update.mockResolvedValue(subWithExpiry)
    mockPrisma.subscription.findUnique.mockResolvedValue(subWithExpiry)

    await confirmPayment({ userId: 'user-1', transactionId: 'tx-789', subscriptionPlanId: 'plan-1' })

    const updateCall = mockPrisma.subscription.update.mock.calls[0][0]
    const newExpiry: Date = updateCall.data.expiresAt

    // The new expiry should be currentExpiry + 30 days (validityDays)
    const expectedExpiry = new Date(currentExpiry)
    expectedExpiry.setDate(expectedExpiry.getDate() + MOCK_PLAN.validityDays)
    // Allow 1-minute tolerance for test execution time
    expect(Math.abs(newExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(60_000)
  })
})
