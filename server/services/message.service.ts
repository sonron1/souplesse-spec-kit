import { prisma } from '../utils/prisma'
import { logger } from '../utils/logger'
import { createError } from 'h3'

export const messageService = {
  /**
   * Returns all messages in a coach↔client conversation,
   * and marks all unread messages for `readerId` as read.
   */
  async getConversation(coachId: string, clientId: string, readerId: string) {
    const messages = await prisma.message.findMany({
      where: { coachId, clientId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Mark unread messages where the reader is the recipient
    const unreadIds = messages
      .filter((m) => m.recipientId === readerId && !m.readAt)
      .map((m) => m.id)

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: new Date() },
      })
    }

    return messages
  },

  /**
   * Sends a message.
   * Rule: a CLIENT cannot send the FIRST message — the coach must have
   * messaged them at least once before the client can reply.
   */
  async sendMessage(input: {
    senderId: string
    recipientId: string
    coachId: string
    clientId: string
    body: string
    senderRole: string
  }) {
    const { senderId, recipientId, coachId, clientId, body, senderRole } = input

    if (!body.trim()) {
      throw createError({ statusCode: 400, message: 'Le message ne peut pas être vide.' })
    }

    // Block client if coach has not initiated yet
    if (senderRole === 'CLIENT') {
      const coachMessageCount = await prisma.message.count({
        where: { coachId, clientId, senderId: coachId },
      })
      if (coachMessageCount === 0) {
        throw createError({
          statusCode: 403,
          message: 'Vous ne pouvez pas initier une conversation — attendez que votre coach vous contacte en premier.',
        })
      }
    }

    const message = await prisma.message.create({
      data: { senderId, recipientId, coachId, clientId, body },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    logger.info(`[message] ${senderRole} ${senderId} → ${recipientId}`)
    return message
  },

  /**
   * For a COACH: returns list of distinct clients they have a conversation with,
   * plus last message snippet + unread count.
   * For a CLIENT: returns their assigned coach conversation summary (if any).
   */
  async getConversations(userId: string, role: string) {
    if (role === 'COACH') {
      // Find all distinct clientIds for this coach
      const rows = await prisma.message.findMany({
        where: { coachId: userId },
        distinct: ['clientId'],
        orderBy: { createdAt: 'desc' },
        select: { clientId: true },
      })

      const conversations = await Promise.all(
        rows.map(async ({ clientId }) => {
          const [last, unread, client] = await Promise.all([
            prisma.message.findFirst({
              where: { coachId: userId, clientId },
              orderBy: { createdAt: 'desc' },
              select: { body: true, createdAt: true, senderId: true },
            }),
            prisma.message.count({
              where: { coachId: userId, clientId, recipientId: userId, readAt: null },
            }),
            prisma.user.findUnique({
              where: { id: clientId },
              select: { id: true, name: true, email: true },
            }),
          ])
          return { client, lastMessage: last, unreadCount: unread }
        })
      )

      return conversations.filter((c) => c.client !== null)
    }

    // CLIENT: find their assigned coach
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { clientId: userId },
      include: { coach: { select: { id: true, name: true, email: true } } },
    })

    if (!assignment) return []

    const [last, unread] = await Promise.all([
      prisma.message.findFirst({
        where: { coachId: assignment.coachId, clientId: userId },
        orderBy: { createdAt: 'desc' },
        select: { body: true, createdAt: true, senderId: true },
      }),
      prisma.message.count({
        where: { coachId: assignment.coachId, clientId: userId, recipientId: userId, readAt: null },
      }),
    ])

    return [{
      coach: assignment.coach,
      coachId: assignment.coachId,
      lastMessage: last,
      unreadCount: unread,
    }]
  },

  /**
   * Total unread messages for a user (badge count).
   */
  async countUnread(userId: string): Promise<number> {
    return prisma.message.count({ where: { recipientId: userId, readAt: null } })
  },
}
