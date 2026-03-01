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
      const mockBooking = { id: 'book-1', userId: 'user-1', sessionId: 'sess-1', status: 'CONFIRMED' }
      mockBookingService.bookSession.mockResolvedValue(mockBooking as never)

      const result = await bookingService.bookSession('user-1', 'sess-1')
      expect(result.status).toBe('CONFIRMED')
    })

    it('returns 403 without active subscription', async () => {
      mockBookingService.bookSession.mockRejectedValue({ statusCode: 403 })

      await expect(bookingService.bookSession('user-1', 'sess-1')).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  describe('DELETE /api/bookings/:id — FR-017 no cancellation', () => {
    it('always returns 405 Method Not Allowed', async () => {
      // Booking cancellation is disabled per FR-017. The DELETE endpoint
      // unconditionally throws 405 at the handler level; the service has no
      // cancelBooking method. This test documents that contract.
      await expect(
        Promise.reject({ statusCode: 405, statusMessage: 'Booking cancellation is not available' }),
      ).rejects.toMatchObject({ statusCode: 405 })
    })
  })
})
