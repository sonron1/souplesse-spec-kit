import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { prisma } from '../../../utils/prisma'
import logger from '../../../utils/logger'

/**
 * DELETE /api/bookings/delete/:id
 * Cancel a booking. Only the owner (or admin) can cancel their own bookings.
 * Only CONFIRMED bookings that haven't started yet can be cancelled.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, message: 'Identifiant de réservation manquant' })

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { session: true },
  })

  if (!booking) throw createError({ statusCode: 404, message: 'Réservation introuvable' })

  // Only owner or admin can cancel
  if (booking.userId !== user.sub && user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }

  if (booking.status === 'CANCELLED') {
    throw createError({ statusCode: 409, message: 'Cette réservation est déjà annulée' })
  }

  // Cannot cancel a session that has already started
  if (booking.session && new Date(booking.session.dateTime) < new Date()) {
    throw createError({ statusCode: 409, message: 'Impossible d\'annuler une séance déjà commencée' })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  logger.info({ bookingId: id, userId: user.sub }, 'Booking cancelled')
  return { success: true, booking: updated }
})
