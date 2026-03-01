import { defineEventHandler, createError } from 'h3'

/**
 * DELETE /api/bookings/:id
 * Cancellation is not available in v1 (FR-017).
 * Confirmed bookings are final.
 */
export default defineEventHandler(async (_event) => {
  throw createError({
    statusCode: 405,
    statusMessage: 'Booking cancellation is not available. Confirmed bookings are final.',
  })
})
