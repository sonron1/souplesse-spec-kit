import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { prisma } from '../../../utils/prisma'

/**
 * GET /api/sessions/:id/bookings
 * Returns all bookings for a session. Coaches and admins only.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  if (user.role !== 'COACH' && user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Réservé aux coachs et administrateurs' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant de séance manquant' })

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session) throw createError({ statusCode: 404, message: 'Séance introuvable' })

  // Only the coach who owns this session (or admin) can view bookings
  if (user.role === 'COACH' && session.coachId !== user.sub) {
    throw createError({ statusCode: 403, message: 'Vous ne pouvez consulter que les réservations de vos propres séances' })
  }

  const bookings = await prisma.booking.findMany({
    where: { sessionId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return { success: true, session, bookings }
})
