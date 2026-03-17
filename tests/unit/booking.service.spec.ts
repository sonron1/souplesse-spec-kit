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

  it('throws 404 if session is not found', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(null) }, // session not found
        booking: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
        businessHours: { findFirst: vi.fn() },
      } as never)
    )
    await expect(bookingService.bookSession('user-1', 'missing-sess')).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('throws 422 if session dateTime is in the past', async () => {
    const pastSession = { ...MOCK_SESSION, dateTime: new Date(Date.now() - 3600000) }
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(pastSession) },
        booking: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
        businessHours: { findFirst: vi.fn() },
      } as never)
    )
    await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('reactivates a CANCELLED booking instead of creating a new one', async () => {
    const cancelledBooking = { ...MOCK_BOOKING, status: 'CANCELLED' as const }
    const reactivated = { ...MOCK_BOOKING, status: 'CONFIRMED' as const }
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    const mockUpdate = vi.fn().mockResolvedValue(reactivated)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(MOCK_SESSION) },
        booking: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn(),
          findUnique: vi.fn().mockResolvedValue(cancelledBooking), // cancelled exists
          update: mockUpdate,
        },
        businessHours: { findFirst: vi.fn().mockResolvedValue(null) },
      } as never)
    )
    const result = await bookingService.bookSession('user-1', 'sess-1')
    expect(result.status).toBe('CONFIRMED')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONFIRMED' } })
    )
  })

  it('throws 422 if session is outside business hours (FR-013)', async () => {
    // Session at 05:00 local on a future Monday — before business opens at 08:00
    const nextMonday2 = new Date()
    nextMonday2.setDate(nextMonday2.getDate() + (8 - nextMonday2.getDay()) % 7 || 7)
    nextMonday2.setHours(5, 0, 0, 0) // 05:00 local time
    const earlySession = { ...MOCK_SESSION, dateTime: nextMonday2 }
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

  it('succeeds when session is within business hours (hits hours block, no error)', async () => {
    // Session at 10:00 on a Monday in the future — within 08:00-20:00
    const nextMonday = new Date()
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7 || 7)
    nextMonday.setHours(10, 0, 0, 0)
    const withinHoursSession = { ...MOCK_SESSION, dateTime: nextMonday }
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(withinHoursSession) },
        booking: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue(MOCK_BOOKING),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        businessHours: {
          findFirst: vi.fn().mockResolvedValue({
            dayOfWeek: 'MONDAY',
            openTime: '08:00',
            closeTime: '20:00',
          }),
        },
      } as never)
    )
    const result = await bookingService.bookSession('user-1', 'sess-1')
    expect(result.status).toBe('CONFIRMED')
  })
})
