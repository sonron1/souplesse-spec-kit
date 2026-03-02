import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'
import { validateQuery, paginationSchema } from '../../validators/index'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const query = validateQuery(event, paginationSchema)
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.payment.count(),
  ])

  return { success: true, payments, total, page, limit }
})
