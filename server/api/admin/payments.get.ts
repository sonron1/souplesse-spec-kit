import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../middleware/role.middleware'
import { validateQuery, paginationSchema } from '../../validators/index'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const query = validateQuery(event, paginationSchema)
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.payment.count(),
  ])

  return { success: true, payments, total, page: query.page, limit: query.limit }
})
