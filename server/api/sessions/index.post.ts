import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireCoach } from '../../utils/role'
import { validateBody } from '../../validators/index'
import { createSessionSchema } from '../../validators/booking.schemas'
import { sessionRepository } from '../../repositories/session.repository'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireCoach(user)

  const body = await validateBody(event, createSessionSchema)

  const session = await sessionRepository.create({
    coachId: user.sub,
    dateTime: new Date(body.dateTime),
    duration: body.duration,
    capacity: body.capacity,
  })

  return { success: true, session }
})
