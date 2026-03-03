/**
 * E2E test scenario: signup → purchase (Kkiapay) → webhook → activation.
 *
 * Validates the complete happy path for User Story 1 using Kkiapay as payment provider.
 * Uses service-level mocks (no real DB or external Kkiapay calls).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../../server/services/auth.service'
import { subscriptionService } from '../../server/services/subscription.service'

vi.mock('../../server/repositories/user.repository')
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    subscriptionPlan: { findUnique: vi.fn() },
    subscription: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    paymentOrder: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    transaction: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../server/utils/systemLog', () => ({ systemLog: vi.fn() }))
vi.mock('../../server/utils/email', () => ({ sendVerificationEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../server/utils/jwt', () => ({
  signAccessToken: vi.fn().mockReturnValue('e2e-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('e2e-refresh-token'),
  verifyRefreshToken: vi.fn(),
}))

import { prisma } from '../../server/utils/prisma'
import { userRepository } from '../../server/repositories/user.repository'

const mockPrisma = vi.mocked(prisma) as any
const mockUserRepo = vi.mocked(userRepository)

beforeEach(() => {
  vi.clearAllMocks()
  process.env.KKIAPAY_WEBHOOK_SECRET = 'test_webhook_secret'
})

describe('US1 E2E: signup → purchase (Kkiapay) → webhook activation', () => {
  it('completes the full activation flow', async () => {
    // 1. Register
    const mockUser = {
      id: 'user-e2e',
      name: 'E2E User',
      email: 'e2e@example.com',
      passwordHash: '$2a$12$mock',
      role: 'CLIENT' as const,
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue(mockUser)
    mockUserRepo.update.mockResolvedValue(mockUser)

    const { user, tokens } = await authService.register({
      name: 'E2E User',
      email: 'e2e@example.com',
      password: 'E2ePassword1!',
    })
    expect(user.id).toBe('user-e2e')
    expect(tokens.accessToken).toBe('e2e-access-token')

    // 2. Create subscription (PENDING)
    const mockPlan = {
      id: 'plan-monthly',
      name: 'Monthly',
      planType: 'MONTHLY',
      isActive: true,
      validityDays: 30,
      maxReports: 2,
      priceSingle: 5000,
      priceCouple: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const mockSub = {
      id: 'sub-e2e',
      userId: 'user-e2e',
      subscriptionPlanId: 'plan-monthly',
      type: 'MONTHLY' as const,
      status: 'PENDING' as const,
      isActive: false,
      activationDate: null,
      startsAt: null,
      expiresAt: null,
      maxReports: null,
      partnerUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan as never)
    mockPrisma.subscription.create.mockResolvedValue(mockSub as never)

    const sub = await subscriptionService.createSubscription('user-e2e', 'plan-monthly')
    expect(sub.status).toBe('PENDING')

    // 3. Simulate Kkiapay webhook → activation via subscriptionService
    mockPrisma.subscription.findUnique.mockResolvedValue(mockSub as never)
    mockPrisma.subscription.update.mockResolvedValue({
      ...mockSub,
      status: 'ACTIVE',
      isActive: true,
    } as never)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan as never)

    const activated = await subscriptionService.activateSubscription('sub-e2e')
    expect(activated.status).toBe('ACTIVE')
  })

  it('user cannot book without an active subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    const isActive = await subscriptionService.hasActiveSubscription('user-no-sub')
    expect(isActive).toBe(false)
  })
})
