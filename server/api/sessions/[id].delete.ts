import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireCoach } from '../../utils/role'
import { prisma } from '../../utils/prisma'
import { sessionRepository } from '../../repositories/session.repository'
import logger from '../../utils/logger'

/**
 * DELETE /api/sessions/:id
 * Coach can only delete their own sessions. Admin can delete any.
 * Deleting a session with confirmed bookings cancels all bookings.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireCoach(user)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant de séance manquant' })

  const session = await sessionRepository.findById(id)
  if (!session) throw createError({ statusCode: 404, message: 'Séance introuvable' })

  // M007: coaches can only delete their own sessions
  if (user.role === 'COACH' && session.coachId !== user.sub) {
    throw createError({ statusCode: 403, message: 'Vous ne pouvez supprimer que vos propres séances' })
  }

  // Cancel all confirmed bookings before deleting
  await prisma.booking.updateMany({
    where: { sessionId: id, status: 'CONFIRMED' },
    data: { status: 'CANCELLED' },
  })

  await sessionRepository.delete(id)

  logger.info({ sessionId: id, coachId: user.sub }, 'Session deleted')
  return { success: true }
})
