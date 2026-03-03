import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../middleware/admin.middleware'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/admin/logs
 * Returns paginated system log entries.
 *
 * Query params:
 *   level    filter by level (info|warn|error)
 *   action   filter by action keyword (partial match)
 *   from     ISO date string start
 *   to       ISO date string end
 *   page     (default 1)
 *   limit    (default 50, max 200)
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const page  = Math.max(1, Number(q.page)  || 1)
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50))
  const skip  = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (q.level)  where.level  = String(q.level)
  if (q.action) where.action = { contains: String(q.action), mode: 'insensitive' }
  if (q.from || q.to) {
    where.createdAt = {}
    if (q.from) (where.createdAt as Record<string, Date>).gte = new Date(String(q.from))
    if (q.to)   (where.createdAt as Record<string, Date>).lte = new Date(String(q.to))
  }

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.systemLog.count({ where }),
  ])

  return { logs, total, page, limit, pages: Math.ceil(total / limit) }
})
