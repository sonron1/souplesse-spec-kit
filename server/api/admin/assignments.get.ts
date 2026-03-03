import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'

/**
 * GET /api/admin/assignments?status=PENDING|ACCEPTED|REJECTED
 * Admin-only: list coach-client assignments, optionally filtered by status.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const { status } = getQuery(event) as { status?: string }
  const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED']

  const assignments = await prisma.coachClientAssignment.findMany({
    where: status && validStatuses.includes(status) ? { status: status as 'PENDING' | 'ACCEPTED' | 'REJECTED' } : undefined,
    include: {
      coach: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return { success: true, assignments }
})
