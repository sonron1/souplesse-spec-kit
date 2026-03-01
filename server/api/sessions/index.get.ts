import { defineEventHandler } from 'h3'
import { validateQuery } from '../../validators/index'
import { listSessionsQuerySchema } from '../../validators/booking.schemas'
import { sessionRepository } from '../../repositories/session.repository'

export default defineEventHandler(async (event) => {
  const query = validateQuery(event, listSessionsQuerySchema)
  const sessions = await sessionRepository.findAll({
    page: query.page,
    limit: query.limit,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  })
  return { success: true, sessions }
})
