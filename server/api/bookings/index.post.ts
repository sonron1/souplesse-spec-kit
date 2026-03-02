import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { validateBody } from '../../validators/index'
import { createBookingSchema } from '../../validators/booking.schemas'
import { bookingService } from '../../services/booking.service'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const { sessionId } = await validateBody(event, createBookingSchema)
  const booking = await bookingService.bookSession(user.sub, sessionId)
  return { success: true, booking }
})
