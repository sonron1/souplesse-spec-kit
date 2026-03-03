import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/coaches
 * Returns the list of all active coaches (name, id).
 * Used by clients to browse and request a coach.
 */
export default defineEventHandler(async (event) => {
  requireAuth(event)

  const coaches = await prisma.user.findMany({
    where: { role: 'COACH' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return { coaches }
})
