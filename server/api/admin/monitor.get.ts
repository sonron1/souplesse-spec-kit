import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/admin/monitor
 * Returns all unique coach↔client conversation threads for admin moderation.
 * Includes last message, message count and unread count per thread.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireRole(user, 'ADMIN')

  // Get all unique (coachId, clientId) pairs where clientId is not null
  const pairs = await prisma.message.findMany({
    where: { clientId: { not: null } },
    distinct: ['coachId', 'clientId'],
    select: { coachId: true, clientId: true },
    orderBy: { createdAt: 'desc' },
  })

  const threads = await Promise.all(
    pairs.map(async ({ coachId, clientId }) => {
      const [coach, client, lastMessage, messageCount, unreadCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: coachId },
          select: { id: true, name: true, email: true },
        }),
        prisma.user.findUnique({
          where: { id: clientId! },
          select: { id: true, name: true, email: true },
        }),
        prisma.message.findFirst({
          where: { coachId, clientId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            senderId: true,
            readAt: true,
            sender: { select: { name: true, role: true } },
          },
        }),
        prisma.message.count({ where: { coachId, clientId } }),
        prisma.message.count({ where: { coachId, clientId, readAt: null } }),
      ])

      return { coachId, clientId, coach, client, lastMessage, messageCount, unreadCount }
    })
  )

  // Sort by most recent last message
  threads.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt?.getTime() ?? 0
    const bTime = b.lastMessage?.createdAt?.getTime() ?? 0
    return bTime - aTime
  })

  return { threads, total: threads.length }
})
