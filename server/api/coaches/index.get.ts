import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'

const coachesRateLimit = rateLimitMiddleware({ max: 30, windowMs: 60_000, keyPrefix: 'coaches-list' })

/**
 * GET /api/coaches
 * Returns the list of all active coaches (name, id).
 * Used by clients to browse and request a coach.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  await coachesRateLimit(event)

  const coaches = await prisma.user.findMany({
    where: { role: 'COACH' },
    select: { id: true, name: true, email: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  })

  return { coaches }
})
