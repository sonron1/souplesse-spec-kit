import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireCoach } from '../../utils/role'
import { validateBody } from '../../validators/index'
import { createSessionSchema } from '../../validators/booking.schemas'
import { sessionRepository } from '../../repositories/session.repository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireCoach(user)

  const body = await validateBody(event, createSessionSchema)

  const dateTime = new Date(body.dateTime)

  // Fix #6: prevent creating sessions in the past
  if (dateTime <= new Date()) {
    throw createError({ statusCode: 422, message: 'La date de la séance doit être dans le futur.' })
  }

  const session = await sessionRepository.create({
    coachId: user.sub,
    dateTime,
    duration: body.duration,
    capacity: body.capacity,
  })

  return { success: true, session }
})
