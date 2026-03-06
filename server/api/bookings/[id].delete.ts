import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { bookingRepository } from '../../repositories/booking.repository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'CLIENT')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Booking id required' })

  const booking = await bookingRepository.findById(id)
  if (!booking) throw createError({ statusCode: 404, message: 'Réservation introuvable' })
  if (booking.userId !== user.sub) throw createError({ statusCode: 403, message: 'Accès refusé' })
  if (booking.status === 'CANCELLED') {
    throw createError({ statusCode: 400, message: 'Cette réservation est déjà annulée' })
  }

  await bookingRepository.cancel(id)
  return { success: true }
})
