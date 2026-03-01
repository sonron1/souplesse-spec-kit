import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { bookingService } from '../../../services/booking.service'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Booking ID required' })
  const booking = await bookingService.cancelBooking(id, user.sub)
  return { success: true, booking }
})
