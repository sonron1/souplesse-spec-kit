import { defineEventHandler } from 'h3'
import { validateQuery } from '../../validators/index'
import { listSessionsQuerySchema } from '../../validators/booking.schemas'
import { sessionRepository } from '../../repositories/session.repository'

/** Plain date "YYYY-MM-DD" → end of that day in UTC so the filter is inclusive. */
function toEndOfDay(v: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T23:59:59.999Z') : new Date(v)
}

export default defineEventHandler(async (event) => {
  const query = validateQuery(event, listSessionsQuerySchema)
  const filterOpts = {
    page: query.page,
    limit: query.limit,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? toEndOfDay(query.to) : undefined,
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
