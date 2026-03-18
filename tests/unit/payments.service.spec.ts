/**
 * R003 — Unit tests for payments.service.ts:
 * - Subscription extension (cumul abonnement): confirmPayment extends expiresAt
 *   when an ACTIVE subscription for the same plan already exists.
 * - New subscription created when no active one exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/prisma', () => {
  // Self-referential so that $transaction calls the callback with the same mock instance,
  // mirroring how Prisma interactive transactions pass a tx client to the callback.
  const inst: Record<string, any> = {
    payment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentOrder: { create: vi.fn(), update: vi.fn() },
  }
  inst.$transaction = vi.fn().mockImplementation((cb: (tx: any) => Promise<any>) => cb(inst))
  return { prisma: inst }
})

vi.mock('@kkiapay-org/nodejs-sdk', () => ({
  kkiapay: vi.fn(() => ({
    verify: vi.fn().mockResolvedValue({ status: 'SUCCESS', amount: 15000 }),
  })),
}))

vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { confirmPayment, createPaymentOrder } from '../../server/services/payments.service'
import { prisma } from '../../server/utils/prisma'

const mockPrisma = vi.mocked(prisma) as any

const MOCK_PLAN = {
  id: 'plan-1',
  name: 'Abonnement 1 mois',
  priceSingle: 15000,
  priceCouple: 25000,
  validityDays: 30,
  maxReports: 0,
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
  // Restore $transaction default implementation after clearAllMocks
  mockPrisma.$transaction.mockImplementation((cb: (tx: any) => Promise<any>) => cb(mockPrisma))
  // Set sensible defaults for helpers called inside every transaction
  mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 })
  mockPrisma.payment.update.mockResolvedValue({})
})

// ── K001/K002: extension instead of duplicate ─────────────────────────────
describe('confirmPayment — subscription extension (K001/K002)', () => {
  it('extends expiresAt when an ACTIVE subscription for the same plan exists', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)          // not yet processed
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst.mockResolvedValue(EXISTING_ACTIVE_SUB) // existing active
    const extendedSub = { ...EXISTING_ACTIVE_SUB, id: 'sub-new', expiresAt: new Date(Date.now() + 40 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(extendedSub)

    const result = await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-123',
      subscriptionPlanId: 'plan-1',
    })

    expect(result.extended).toBe(true)
    // New code always creates a new sub record (even for extensions)
    expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt: expect.any(Date) }),
      })
    )
    // subscription.updateMany deactivates the old sub before creating the new one
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE' }),
        data: expect.objectContaining({ status: 'EXPIRED', isActive: false }),
      })
    )
    // subscription.update is never called in the new activation path
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled()
  })

  it('creates a new subscription when no active one exists', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst.mockResolvedValue(null) // no existing active sub
    const newSub = { id: 'sub-new', userId: 'user-1', status: 'ACTIVE', isActive: true, expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub)

    const result = await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-456',
      subscriptionPlanId: 'plan-1',
    })

    expect(result.extended).toBe(false)
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce()
    // subscription.update is never called in the new activation path
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
      .mockResolvedValueOnce(null)  // buyer tx: cumulation check — no existing active for buyer
      .mockResolvedValueOnce(null)  // partner tx: couple conflict check — partner not already in couple
      .mockResolvedValueOnce(null)  // partner tx: cumulation check — no existing active for partner
    const newSub = { id: 'sub-main', expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub)

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
    const partnerSub = { id: 'partner-sub', subscriptionPlanId: 'plan-1', status: 'ACTIVE', isActive: true, expiresAt: new Date(Date.now() + 5 * 86400000) }
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst
      .mockResolvedValueOnce(null)       // buyer tx: cumulation check — no existing active for buyer
      .mockResolvedValueOnce(null)       // partner tx: couple conflict check — partner not already in couple
      .mockResolvedValueOnce(partnerSub) // partner tx: cumulation check — partner has active sub for same plan
    const newSub = { id: 'sub-main', expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub)

    await confirmPayment({
      userId: 'user-1',
      transactionId: 'tx-couple2',
      subscriptionPlanId: 'plan-1',
      partnerUserId: 'partner-1',
    })

    // Both buyer and partner get a new sub record created (extension = new record with pushed-out expiry)
    expect(mockPrisma.subscription.create).toHaveBeenCalledTimes(2)
    // subscription.update is never called in the new activation path
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled()
  })

  it('extends expiresAt by plan.validityDays from current expiresAt', async () => {
    const currentExpiry = new Date(Date.now() + 10 * 86400000)
    const subWithExpiry = { ...EXISTING_ACTIVE_SUB, expiresAt: currentExpiry }

    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue(MOCK_PAYMENT)
    mockPrisma.subscription.findFirst.mockResolvedValue(subWithExpiry)
    const extendedSub = { ...subWithExpiry, id: 'sub-extended', expiresAt: new Date(currentExpiry.getTime() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(extendedSub)

    await confirmPayment({ userId: 'user-1', transactionId: 'tx-789', subscriptionPlanId: 'plan-1' })

    const createCall = mockPrisma.subscription.create.mock.calls[0][0]
    const newExpiry: Date = createCall.data.expiresAt

    // The new expiry should be currentExpiry + 30 days (validityDays) in milliseconds
    // Use the same arithmetic as the service to avoid DST-induced 1h drift
    const expectedExpiry = new Date(currentExpiry.getTime() + MOCK_PLAN.validityDays * 86_400_000)
    // Allow 1-minute tolerance for test execution time
    expect(Math.abs(newExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(60_000)
  })
})

// ── createPaymentOrder ─────────────────────────────────────────────────────
describe('createPaymentOrder', () => {
  const MOCK_ORDER = {
    id: 'order-1',
    userId: 'user-1',
    subscriptionPlanId: 'plan-1',
    partnerUserId: null,
    amount: 15000,
    currency: 'XOF',
    status: 'pending',
    kkiapayOrderToken: null,
  }

  it('returns a mock token when KKIAPAY_SECRET_KEY is not set', async () => {
    delete process.env.KKIAPAY_SECRET_KEY
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ ...MOCK_PLAN, planType: null, priceCouple: null } as never)
    mockPrisma.paymentOrder.create.mockResolvedValue(MOCK_ORDER as never)
    mockPrisma.paymentOrder.update.mockResolvedValue({ ...MOCK_ORDER, kkiapayOrderToken: `mock-token-${MOCK_ORDER.id}` } as never)

    const result = await createPaymentOrder({ userId: 'user-1', subscriptionPlanId: 'plan-1' })
    expect(result.kkiapayToken).toMatch(/^mock-token-/)
    expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kkiapayOrderToken: expect.stringContaining('mock-token-') }) })
    )
  })

  it('uses priceCouple for couple plans', async () => {
    delete process.env.KKIAPAY_SECRET_KEY
    const couplePlan = { ...MOCK_PLAN, planType: 'COUPLE_MONTHLY', priceCouple: 25000 }
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(couplePlan as never)
    const coupleOrder = { ...MOCK_ORDER, amount: 25000 }
    mockPrisma.paymentOrder.create.mockResolvedValue(coupleOrder as never)
    mockPrisma.paymentOrder.update.mockResolvedValue(coupleOrder as never)

    const result = await createPaymentOrder({ userId: 'user-1', subscriptionPlanId: 'plan-1', partnerUserId: 'partner-1' })
    expect(mockPrisma.paymentOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 25000 }) })
    )
    expect(result.kkiapayToken).toBeTruthy()
  })

  it('throws when plan is not found', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null)
    await expect(createPaymentOrder({ userId: 'user-1', subscriptionPlanId: 'bad-plan' })).rejects.toThrow('SubscriptionPlan not found')
  })

  it('calls Kkiapay API and returns real token when KKIAPAY_SECRET_KEY is set', async () => {
    process.env.KKIAPAY_SECRET_KEY = 'test-secret'
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ ...MOCK_PLAN, planType: null, priceCouple: null } as never)
    mockPrisma.paymentOrder.create.mockResolvedValue(MOCK_ORDER as never)
    const updatedOrder = { ...MOCK_ORDER, kkiapayOrderToken: 'real-token-abc' }
    mockPrisma.paymentOrder.update.mockResolvedValue(updatedOrder as never)

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { token: 'real-token-abc' } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await createPaymentOrder({ userId: 'user-1', subscriptionPlanId: 'plan-1' })
    expect(result.kkiapayToken).toBe('real-token-abc')
    expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kkiapayOrderToken: 'real-token-abc' }) })
    )

    vi.unstubAllGlobals()
    delete process.env.KKIAPAY_SECRET_KEY
  })

  it('throws when Kkiapay API returns non-ok response', async () => {
    process.env.KKIAPAY_SECRET_KEY = 'test-secret'
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ ...MOCK_PLAN, planType: null, priceCouple: null } as never)
    mockPrisma.paymentOrder.create.mockResolvedValue(MOCK_ORDER as never)

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(createPaymentOrder({ userId: 'user-1', subscriptionPlanId: 'plan-1' })).rejects.toThrow('Kkiapay order creation failed')

    vi.unstubAllGlobals()
    delete process.env.KKIAPAY_SECRET_KEY
  })
})

// ── confirmPayment additional branches ────────────────────────────────────
describe('confirmPayment — additional branches', () => {
  it('uses plan.priceSingle when verifyData.amount is not a number', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    const payment = { id: 'p-1', amount: 15000 }
    mockPrisma.payment.create.mockResolvedValue(payment as never)
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    const newSub = { id: 'sub-1', expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub as never)

    // kkiapay mock returns { status: 'SUCCESS', amount: undefined } → not a number
    const { kkiapay } = await import('@kkiapay-org/nodejs-sdk')
    vi.mocked(kkiapay).mockReturnValue({ verify: vi.fn().mockResolvedValue({ status: 'SUCCESS', amount: 'not-a-number' }) } as never)

    const result = await confirmPayment({ userId: 'user-1', transactionId: 'tx-no-amount', subscriptionPlanId: 'plan-1' })
    expect(result.subscriptionId).toBe('sub-1')
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: MOCK_PLAN.priceSingle }) })
    )
  })

  it('silently catches partner subscription failure (does not throw)', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN)
    mockPrisma.payment.create.mockResolvedValue({ id: 'p-2' } as never)
    const newSub = { id: 'sub-2', expiresAt: new Date(Date.now() + 30 * 86400000) }
    mockPrisma.subscription.create.mockResolvedValue(newSub as never)
    mockPrisma.subscription.findFirst
      .mockResolvedValueOnce(null)    // buyer has no active sub (inside buyer tx)
      .mockRejectedValueOnce(new Error('DB error on partner lookup')) // partner lookup fails inside partner tx

    const { kkiapay } = await import('@kkiapay-org/nodejs-sdk')
    vi.mocked(kkiapay).mockReturnValue({ verify: vi.fn().mockResolvedValue({ status: 'SUCCESS', amount: 15000 }) } as never)

    // Should not throw even though partner lookup fails
    await expect(
      confirmPayment({ userId: 'user-1', transactionId: 'tx-partner-fail', subscriptionPlanId: 'plan-1', partnerUserId: 'partner-fail' })
    ).resolves.toBeDefined()
  })

  it('throws when KKiaPay verify call rejects', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)

    const { kkiapay } = await import('@kkiapay-org/nodejs-sdk')
    vi.mocked(kkiapay).mockReturnValue({ verify: vi.fn().mockRejectedValue(new Error('Network error')) } as never)

    await expect(
      confirmPayment({ userId: 'user-1', transactionId: 'tx-fail', subscriptionPlanId: 'plan-1' })
    ).rejects.toThrow('KKiaPay verification failed: Network error')
  })

  it('throws when KKiaPay returns a non-successful status', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null)

    const { kkiapay } = await import('@kkiapay-org/nodejs-sdk')
    vi.mocked(kkiapay).mockReturnValue({ verify: vi.fn().mockResolvedValue({ status: 'FAILED', amount: 15000 }) } as never)

    await expect(
      confirmPayment({ userId: 'user-1', transactionId: 'tx-failed', subscriptionPlanId: 'plan-1' })
    ).rejects.toThrow('Transaction not successful')
  })
})
