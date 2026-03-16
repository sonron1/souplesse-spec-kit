import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const page = query.page ? Math.max(1, parseInt(String(query.page), 10)) : undefined
  const limit = query.limit ? Math.min(100, Math.max(1, parseInt(String(query.limit), 10))) : undefined

  if (page !== undefined && limit !== undefined) {
    const skip = (page - 1) * limit
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: user.sub },
        include: { session: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { userId: user.sub } }),
    ])
    return { bookings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  // Backward-compat: no pagination params → return flat array
  const bookings = await prisma.booking.findMany({
    where: { userId: user.sub },
    include: { session: true },
    orderBy: { createdAt: 'desc' },
  })
  return bookings
})
