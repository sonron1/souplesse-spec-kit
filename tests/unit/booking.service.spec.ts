import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookingService } from '../../server/services/booking.service'

vi.mock('../../server/utils/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    session: { findUnique: vi.fn() },
    booking: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../../server/repositories/session.repository')
vi.mock('../../server/repositories/booking.repository')
vi.mock('../../server/services/subscription.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'
import { subscriptionService } from '../../server/services/subscription.service'
import { bookingRepository } from '../../server/repositories/booking.repository'
import { sessionRepository } from '../../server/repositories/session.repository'

const mockPrisma = vi.mocked(prisma)
const mockSubscription = vi.mocked(subscriptionService)
const mockBookingRepo = vi.mocked(bookingRepository)
const mockSessionRepo = vi.mocked(sessionRepository)

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
  status: 'BOOKED' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => { vi.clearAllMocks() })

describe('bookingService.bookSession', () => {
  it('creates a booking when all conditions are met', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => any) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(MOCK_SESSION) },
        booking: { count: vi.fn().mockResolvedValue(3), create: vi.fn().mockResolvedValue(MOCK_BOOKING) },
      } as never)
    )
    const result = await bookingService.bookSession('user-1', 'sess-1')
    expect(result.status).toBe('BOOKED')
  })

  it('throws 403 if user has no active subscription', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(false)

    await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
      statusCode: 403,
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
})

describe('bookingService.cancelBooking', () => {
  it('cancels a booking within the allowed window', async () => {
    const farFutureSession = { ...MOCK_SESSION, dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000) }
    mockBookingRepo.findById.mockResolvedValue(MOCK_BOOKING)
    mockSessionRepo.findById.mockResolvedValue(farFutureSession)
    mockBookingRepo.cancel.mockResolvedValue({ ...MOCK_BOOKING, status: 'CANCELLED' })

    const result = await bookingService.cancelBooking('book-1', 'user-1')
    expect(result.status).toBe('CANCELLED')
  })

  it('throws 403 if user is not the booking owner', async () => {
    mockBookingRepo.findById.mockResolvedValue(MOCK_BOOKING) // userId: user-1
    await expect(bookingService.cancelBooking('book-1', 'other-user')).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('throws 422 if cancellation window has passed', async () => {
    const imminent = { ...MOCK_SESSION, dateTime: new Date(Date.now() + 30 * 60 * 1000) } // 30 min away
    mockBookingRepo.findById.mockResolvedValue(MOCK_BOOKING)
    mockSessionRepo.findById.mockResolvedValue(imminent)

    await expect(bookingService.cancelBooking('book-1', 'user-1')).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})
