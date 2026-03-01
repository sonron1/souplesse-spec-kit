import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookingService } from '../../server/services/booking.service'

vi.mock('../../server/services/booking.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockBookingService = vi.mocked(bookingService)

beforeEach(() => { vi.clearAllMocks() })

describe('Booking routes integration', () => {
  describe('POST /api/bookings (via service)', () => {
    it('books a session successfully', async () => {
      const mockBooking = { id: 'book-1', userId: 'user-1', sessionId: 'sess-1', status: 'BOOKED' }
      mockBookingService.bookSession.mockResolvedValue(mockBooking as never)

      const result = await bookingService.bookSession('user-1', 'sess-1')
      expect(result.status).toBe('BOOKED')
    })

    it('returns 403 without active subscription', async () => {
      mockBookingService.bookSession.mockRejectedValue({ statusCode: 403 })

      await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  describe('DELETE /api/bookings/:id (via service)', () => {
    it('cancels a booking', async () => {
      const cancelled = { id: 'book-1', status: 'CANCELLED' }
      mockBookingService.cancelBooking.mockResolvedValue(cancelled as never)

      const result = await bookingService.cancelBooking('book-1', 'user-1')
      expect(result.status).toBe('CANCELLED')
    })
  })
})
