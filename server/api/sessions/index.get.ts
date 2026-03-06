import { defineEventHandler } from 'h3'
import { validateQuery } from '../../validators/index'
import { listSessionsQuerySchema } from '../../validators/booking.schemas'
import { sessionRepository } from '../../repositories/session.repository'

export default defineEventHandler(async (event) => {
  const query = validateQuery(event, listSessionsQuerySchema)
  const filterOpts = {
    page: query.page,
    limit: query.limit,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
    order: (query.order ?? 'asc') as 'asc' | 'desc',
  }
  const [sessions, total] = await Promise.all([
    sessionRepository.findAll(filterOpts),
    sessionRepository.countAll({ from: filterOpts.from, to: filterOpts.to }),
  ])
  return {
    success: true,
    sessions,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / (query.limit ?? 20))),
    },
  }
})
