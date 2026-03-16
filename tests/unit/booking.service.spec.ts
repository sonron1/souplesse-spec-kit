import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookingService } from '../../server/services/booking.service'

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    session: { findUnique: vi.fn() },
    booking: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    businessHours: { findFirst: vi.fn() },
  },
}))

vi.mock('../../server/repositories/session.repository')
vi.mock('../../server/repositories/booking.repository')
vi.mock('../../server/services/subscription.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../server/utils/systemLog', () => ({ systemLog: vi.fn() }))

import { prisma } from '../../server/utils/prisma'
import { subscriptionService } from '../../server/services/subscription.service'
import { bookingRepository } from '../../server/repositories/booking.repository'

const mockPrisma = vi.mocked(prisma)
const mockSubscription = vi.mocked(subscriptionService)
const mockBookingRepo = vi.mocked(bookingRepository)

const MOCK_SESSION = {
  id: 'sess-1',
  coachId: 'coach-1',
  dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
  duration: 60,
  capacity: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const MOCK_BOOKING = {
  id: 'book-1',
  userId: 'user-1',
  sessionId: 'sess-1',
  status: 'CONFIRMED' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('bookingService.bookSession', () => {
  it('creates a booking when all conditions are met', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(MOCK_SESSION) },
        booking: {
          count: vi.fn().mockResolvedValue(3),
          create: vi.fn().mockResolvedValue(MOCK_BOOKING),
          findUnique: vi.fn().mockResolvedValue(null), // no cancelled booking
        },
        businessHours: { findFirst: vi.fn().mockResolvedValue(null) },
      } as never)
    )
    const result = await bookingService.bookSession('user-1', 'sess-1')
    expect(result.status).toBe('CONFIRMED')
  })

  it('throws 402 if user has no active subscription', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(false)

    await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
      statusCode: 402,
    })
  })

  it('throws 409 if session is at capacity', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(MOCK_SESSION) },
        booking: { count: vi.fn().mockResolvedValue(10) }, // capacity = 10, full
      } as never)
    )

    await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('throws 409 if user already has a booking for this session', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(MOCK_BOOKING)

    await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('throws 422 if session is outside business hours (FR-013)', async () => {
    // Session at 05:00 UTC — before business opens at 08:00 (any timezone up to UTC+3)
    const earlySession = {
      ...MOCK_SESSION,
      dateTime: new Date('2026-03-02T05:00:00.000Z'), // Monday 05:00 UTC
    }
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(earlySession) },
        booking: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
        businessHours: {
          findFirst: vi.fn().mockResolvedValue({
            dayOfWeek: 'MONDAY',
            openTime: '08:00',
            closeTime: '20:00',
          }),
        },
      } as never)
    )

    await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})
