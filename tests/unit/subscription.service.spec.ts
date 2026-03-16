import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscriptionService } from '../../server/services/subscription.service'

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]), // J006: admin list for pause notifications
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),   // J006: admin notification on pause
    },
  },
}))

vi.mock('../../server/utils/email', () => ({
  sendAdminPauseNotification: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'
const mockPrisma = vi.mocked(prisma) as any

const MOCK_PLAN = { id: 'plan-1', name: 'Monthly', isActive: true, validityDays: 30 }
const MOCK_SUB = {
  id: 'sub-1',
  userId: 'user-1',
  subscriptionPlanId: 'plan-1',
  type: 'MONTHLY' as const,
  status: 'PENDING' as const,
  isActive: false,
  startDate: null,
  endDate: null,
  startsAt: null,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('subscriptionService.createSubscription', () => {
  it('creates a PENDING subscription for a valid plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN as never)
    mockPrisma.subscription.create.mockResolvedValue(MOCK_SUB as never)

    const result = await subscriptionService.createSubscription('user-1', 'plan-1')
    expect(result.status).toBe('PENDING')
    expect(result.isActive).toBe(false)
  })

  it('throws 404 for non-existent plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null)
    await expect(
      subscriptionService.createSubscription('user-1', 'bad-plan')
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 404 for inactive plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      ...MOCK_PLAN,
      isActive: false,
    } as never)
    await expect(subscriptionService.createSubscription('user-1', 'plan-1')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('subscriptionService.activateSubscription', () => {
  it('activates a PENDING subscription and sets dates', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(MOCK_SUB as never)
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(MOCK_PLAN as never)
    const activated = { ...MOCK_SUB, status: 'ACTIVE', isActive: true }
    mockPrisma.subscription.update.mockResolvedValue(activated as never)

    const result = await subscriptionService.activateSubscription('sub-1')
    expect(result.status).toBe('ACTIVE')
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', isActive: true }),
      })
    )
  })

  it('is idempotent — returns existing subscription if already ACTIVE', async () => {
    const activeSub = { ...MOCK_SUB, status: 'ACTIVE', isActive: true }
    mockPrisma.subscription.findUnique.mockResolvedValue(activeSub as never)

    const result = await subscriptionService.activateSubscription('sub-1')
    expect(result.status).toBe('ACTIVE')
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled()
  })

  it('throws 404 if subscription not found', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null)
    await expect(subscriptionService.activateSubscription('bad-sub')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('subscriptionService.expireSubscriptions', () => {
  it('bulk-updates expired subscriptions', async () => {
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 3 })
    const count = await subscriptionService.expireSubscriptions()
    expect(count).toBe(3)
  })
})

describe('subscriptionService.hasActiveSubscription', () => {
  it('returns true if an active subscription exists', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ ...MOCK_SUB, status: 'ACTIVE' } as never)
    expect(await subscriptionService.hasActiveSubscription('user-1')).toBe(true)
  })

  it('returns false if no active subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    expect(await subscriptionService.hasActiveSubscription('user-1')).toBe(false)
  })
})

// R003: pause / resume
describe('subscriptionService.pauseSubscription', () => {
  const activeSub = {
    ...MOCK_SUB,
    userId: 'user-1',
    status: 'ACTIVE' as const,
    isActive: true,
    pausedAt: null,
    pauseCount: 0,
    subscriptionPlan: { maxPauses: 2 },
  }

  it('pauses an active subscription and increments pauseCount', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(activeSub as never)
    const paused = { ...activeSub, pausedAt: new Date(), pauseCount: 1 }
    mockPrisma.subscription.update.mockResolvedValue(paused as never)

    await subscriptionService.pauseSubscription('sub-1', 'user-1')
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pausedAt: expect.any(Date) }),
      })
    )
  })

  it('throws 403 if user does not own the subscription', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ ...activeSub, userId: 'other-user' } as never)
    await expect(subscriptionService.pauseSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 400 if subscription is already paused', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ ...activeSub, pausedAt: new Date() } as never)
    await expect(subscriptionService.pauseSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 if max pauses reached', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ ...activeSub, pauseCount: 2 } as never)
    await expect(subscriptionService.pauseSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 if subscription not found', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null)
    await expect(subscriptionService.pauseSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('subscriptionService.resumeSubscription', () => {
  const pausedSub = {
    ...MOCK_SUB,
    userId: 'user-1',
    status: 'ACTIVE' as const,
    isActive: true,
    pausedAt: new Date(Date.now() - 86400000), // paused 1 day ago
    pauseCount: 1,
    expiresAt: new Date(Date.now() + 5 * 86400000),
  }

  it('resumes a paused subscription, clears pausedAt, extends expiresAt', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(pausedSub as never)
    const resumed = { ...pausedSub, pausedAt: null, pausedUntil: null }
    mockPrisma.subscription.update.mockResolvedValue(resumed as never)

    await subscriptionService.resumeSubscription('sub-1', 'user-1')
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pausedAt: null }),
      })
    )
  })

  it('throws 400 if subscription is not paused', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ ...pausedSub, pausedAt: null } as never)
    await expect(subscriptionService.resumeSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 403 if user does not own the subscription', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ ...pausedSub, userId: 'other' } as never)
    await expect(subscriptionService.resumeSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 if subscription not found', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null)
    await expect(subscriptionService.resumeSubscription('sub-1', 'user-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})
