import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { bookingRepository } from '../../repositories/booking.repository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const bookings = await bookingRepository.findByUser(user.sub)
  return bookings
})
