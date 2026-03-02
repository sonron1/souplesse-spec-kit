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
    throw createError({ statusCode: 403, statusMessage: 'Coaches and admins only' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Session ID required' })

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session not found' })

  // Only the coach who owns this session (or admin) can view bookings
  if (user.role === 'COACH' && session.coachId !== user.sub) {
    throw createError({ statusCode: 403, statusMessage: 'You can only view bookings for your own sessions' })
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
