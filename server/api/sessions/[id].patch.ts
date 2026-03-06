import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireCoach } from '../../utils/role'
import { validateBody } from '../../validators/index'
import { z } from 'zod'
import { sessionRepository } from '../../repositories/session.repository'

const updateSessionSchema = z.object({
  dateTime: z.string().datetime().optional(),
  duration: z.number().int().min(15).max(240).optional(),
  capacity: z.number().int().min(1).max(200).optional(),
  location: z.string().max(200).optional().nullable(),
})

/**
 * PATCH /api/sessions/:id
 * Coach can only update their own sessions. Admin can update any.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireCoach(user)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant de séance manquant' })

  const session = await sessionRepository.findById(id)
  if (!session) throw createError({ statusCode: 404, message: 'Séance introuvable' })

  // M006: coaches can only edit their own sessions
  if (user.role === 'COACH' && session.coachId !== user.sub) {
    throw createError({ statusCode: 403, message: 'Vous ne pouvez modifier que vos propres séances' })
  }

  const body = await validateBody(event, updateSessionSchema)

  const updated = await sessionRepository.update(id, {
    ...(body.dateTime ? { dateTime: new Date(body.dateTime) } : {}),
    ...(body.duration !== undefined ? { duration: body.duration } : {}),
    ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
    ...(body.location !== undefined ? { location: body.location ?? undefined } : {}),
  })

  return { success: true, session: updated }
})
