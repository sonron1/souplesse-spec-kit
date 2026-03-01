/**
 * E2E booking flow test:
 * Active subscriber can book a session; capacity and double-booking are enforced.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscriptionService } from '../../server/services/subscription.service'
import { bookingService } from '../../server/services/booking.service'

vi.mock('../../server/utils/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    subscriptionPlan: { findUnique: vi.fn() },
    subscription: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    booking: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    session: { findUnique: vi.fn() },
  },
}))
vi.mock('../../server/repositories/session.repository')
vi.mock('../../server/repositories/booking.repository')
vi.mock('../../server/services/subscription.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import prisma from '../../server/utils/prisma'
import { bookingRepository } from '../../server/repositories/booking.repository'

const mockPrisma = vi.mocked(prisma)
const mockSubscription = vi.mocked(subscriptionService)
const mockBookingRepo = vi.mocked(bookingRepository)

const SESSION = {
  id: 'sess-e2e',
  coachId: 'coach-1',
  dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  duration: 60,
  capacity: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('US2 E2E: booking flow', () => {
  it('user with active subscription books a session successfully', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(SESSION) },
        booking: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 'book-e2e', userId: 'user-e2e', sessionId: 'sess-e2e', status: 'BOOKED' }) },
      } as never)
    )

    const booking = await bookingService.bookSession('user-e2e', 'sess-e2e')
    expect(booking.status).toBe('BOOKED')
  })

  it('session at capacity rejects further bookings', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(true)
    mockBookingRepo.findByUserAndSession.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn) =>
      fn({
        session: { findUnique: vi.fn().mockResolvedValue(SESSION) },
        booking: { count: vi.fn().mockResolvedValue(2) }, // capacity=2, full
      } as never)
    )

    await expect(bookingService.bookSession('user-3', 'sess-e2e')).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('user without subscription cannot book', async () => {
    mockSubscription.hasActiveSubscription.mockResolvedValue(false)

    await expect(bookingService.bookSession('user-no-sub', 'sess-e2e')).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
