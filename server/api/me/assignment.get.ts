import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/me/assignment
 * CLIENT only — returns the client's current coach assignment (any status).
 */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)

  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { clientId: me.sub },
    orderBy: { assignedAt: 'desc' },
    include: {
      coach: { select: { id: true, name: true, email: true } },
    },
  })

  return { assignment }
})
