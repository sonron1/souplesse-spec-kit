import { defineEventHandler } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'

/**
 * GET /api/admin/assignments
 * Admin-only: list all coach-client assignments.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const assignments = await prisma.coachClientAssignment.findMany({
    include: {
      coach: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { assignedAt: 'desc' },
  })

  return { success: true, assignments }
})
