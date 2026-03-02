import { defineEventHandler } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../middleware/auth.middleware'

/**
 * GET /api/coach/clients
 * Coach: return the list of clients assigned to the authenticated coach.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const assignments = await prisma.coachClientAssignment.findMany({
    where: { coachId: user.sub },
    include: {
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })

  const clients = assignments.map((a) => a.client)

  return { success: true, clients }
})
