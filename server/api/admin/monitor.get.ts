import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/admin/monitor
 * Returns all coach↔client threads grouped by coach, for admin moderation.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'ADMIN')

  // Fetch all messages that belong to a coach↔client thread
  const allMessages = await prisma.message.findMany({
    where: { clientId: { not: null } },
    select: { coachId: true, clientId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Build unique (coachId, clientId) pairs preserving the latest-first order
  const seen = new Set<string>()
  const pairs: { coachId: string; clientId: string }[] = []
  for (const msg of allMessages) {
    if (!msg.clientId) continue
    const key = `${msg.coachId}::${msg.clientId}`
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ coachId: msg.coachId, clientId: msg.clientId })
    }
  }

  // Fetch details for every pair
  const threads = await Promise.all(
    pairs.map(async ({ coachId, clientId }) => {
      const [coach, client, lastMessage, messageCount, unreadCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: coachId },
          select: { id: true, name: true, email: true },
        }),
        prisma.user.findUnique({
          where: { id: clientId },
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

  // Group by coach
  const coachMap = new Map<string, {
    coach: { id: string; name: string; email: string } | null
    threads: typeof threads
  }>()

  for (const thread of threads) {
    if (!coachMap.has(thread.coachId)) {
      coachMap.set(thread.coachId, { coach: thread.coach, threads: [] })
    }
    coachMap.get(thread.coachId)!.threads.push(thread)
  }

  const byCoach = Array.from(coachMap.values()).sort((a, b) =>
    (a.coach?.name ?? '').localeCompare(b.coach?.name ?? '', 'fr')
  )

  return { byCoach, totalThreads: threads.length }
})

