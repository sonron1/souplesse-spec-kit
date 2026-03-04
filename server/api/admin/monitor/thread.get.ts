import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/admin/monitor/thread?coachId=...&clientId=...
 * Returns all messages in a coach↔client thread for admin read-only moderation.
 * Does NOT mark messages as read.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireRole(user, 'ADMIN')

  const { coachId, clientId } = getQuery(event) as { coachId?: string; clientId?: string }

  if (!coachId || !clientId) {
    throw createError({ statusCode: 400, message: 'coachId et clientId sont requis.' })
  }

  const messages = await prisma.message.findMany({
    where: { coachId, clientId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  })

  return { messages, coachId, clientId }
})
