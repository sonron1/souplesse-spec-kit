import { prisma } from '../utils/prisma'
import { logger } from '../utils/logger'
import { createError } from 'h3'

type MessageWithSender = {
  id: string
  senderId: string
  recipientId: string
  coachId: string
  clientId: string | null
  body: string
  readAt: Date | null
  createdAt: Date
  sender: { id: string; name: string; role: string }
}

export const messageService = {
  // ─────────────────────────────────────────────────────────────────────────
  // COACH ↔ CLIENT thread
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns messages in a coach↔client conversation,
   * and marks all unread messages for `readerId` as read.
   * Optional pagination: { page, limit } → returns { messages, pagination }
   */
  async getConversation(coachId: string, clientId: string, readerId: string, pagination?: { page: number; limit: number }) {
    const where = { coachId, clientId }

    if (pagination) {
      const { page, limit } = pagination
      const skip = (page - 1) * limit
      const [messages, total]: [MessageWithSender[], number] = await Promise.all([
        prisma.message.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
          skip,
          take: limit,
        }) as Promise<MessageWithSender[]>,
        prisma.message.count({ where }),
      ])

      const unreadIds = messages.filter((m) => m.recipientId === readerId && !m.readAt).map((m) => m.id)
      if (unreadIds.length > 0) {
        await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } })
      }

      return { messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    }

    const messages: MessageWithSender[] = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

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
   * Sends a coach↔client message.
   * Rule: a CLIENT cannot send the FIRST message — the coach must have
   * messaged them at least once.
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

    const message = await prisma.message.create({
      data: { senderId, recipientId, coachId, clientId, body },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    logger.info(`[message] ${senderRole} ${senderId} → ${recipientId}`)
    return message
  },

  /**
   * For a COACH: list client conversations (coach↔client threads only).
   * For a CLIENT: their assigned coach conversation summary (if any).
   */
  async getConversations(userId: string, role: string) {
    if (role === 'COACH') {
      const rows = await prisma.message.findMany({
        where: { coachId: userId, clientId: { not: null } },
        distinct: ['clientId'],
        orderBy: { createdAt: 'desc' },
        select: { clientId: true },
      })

      type ConvRow = {
        client: { id: string; name: string; email: string } | null
        lastMessage: { body: string; createdAt: Date; senderId: string } | null
        unreadCount: number
      }
      const conversations: ConvRow[] = await Promise.all(
        rows.map(async ({ clientId }: { clientId: string | null }) => {
          if (!clientId) return { client: null, lastMessage: null, unreadCount: 0 }
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

      return conversations.filter((c): c is ConvRow & { client: NonNullable<ConvRow['client']> } => c.client !== null)
    }

    // CLIENT — only accepted assignment has an active thread
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { clientId: userId, status: 'ACCEPTED' },
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

    return [{ coach: assignment.coach, coachId: assignment.coachId, lastMessage: last, unreadCount: unread }]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN ↔ COACH direct thread (clientId = null)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns messages between admin and a specific coach (direct thread).
   * Marks unread messages for readerId as read.
   * Optional pagination: { page, limit } → returns { messages, pagination }
   */
  async getDirectThread(coachId: string, readerId: string, pagination?: { page: number; limit: number }) {
    const where = { coachId, clientId: null }

    if (pagination) {
      const { page, limit } = pagination
      const skip = (page - 1) * limit
      const [messages, total]: [MessageWithSender[], number] = await Promise.all([
        prisma.message.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
          skip,
          take: limit,
        }) as Promise<MessageWithSender[]>,
        prisma.message.count({ where }),
      ])

      const unreadIds = messages.filter((m) => m.recipientId === readerId && !m.readAt).map((m) => m.id)
      if (unreadIds.length > 0) {
        await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } })
      }

      return { messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    }

    const messages: MessageWithSender[] = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

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
   * Sends a direct message between admin and a coach.
   * Only ADMIN or the target COACH can participate.
   */
  async sendDirectMessage(input: {
    senderId: string
    recipientId: string
    coachId: string
    body: string
    senderRole: string
  }) {
    const { senderId, recipientId, coachId, body, senderRole } = input

    if (!body.trim()) {
      throw createError({ statusCode: 400, message: 'Le message ne peut pas être vide.' })
    }

    if (senderRole !== 'ADMIN' && senderRole !== 'COACH') {
      throw createError({ statusCode: 403, message: 'Seuls les administrateurs et les coachs peuvent utiliser la messagerie directe.' })
    }

    const message = await prisma.message.create({
      data: { senderId, recipientId, coachId, clientId: null, body },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    logger.info(`[direct-message] ${senderRole} ${senderId} → ${recipientId}`)
    return message
  },

  /**
   * For ADMIN: list all coaches they have a direct thread with (clientId=null),
   * plus coaches who have no thread yet (for starting new conversations).
   */
  async getAdminCoachConversations(adminId: string) {
    const rows = await prisma.message.findMany({
      where: { clientId: null },
      distinct: ['coachId'],
      orderBy: { createdAt: 'desc' },
      select: { coachId: true },
    })

    return Promise.all(
      rows.map(async ({ coachId }: { coachId: string }) => {
        const [last, unread, coach] = await Promise.all([
          prisma.message.findFirst({
            where: { coachId, clientId: null },
            orderBy: { createdAt: 'desc' },
            select: { body: true, createdAt: true, senderId: true },
          }),
          prisma.message.count({
            where: { coachId, clientId: null, recipientId: adminId, readAt: null },
          }),
          prisma.user.findUnique({
            where: { id: coachId },
            select: { id: true, name: true, email: true },
          }),
        ])
        return { coach, coachId, lastMessage: last, unreadCount: unread }
      })
    )
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Unread badge
  // ─────────────────────────────────────────────────────────────────────────

  /** Total unread messages for a user (badge count). */
  async countUnread(userId: string): Promise<number> {
    return prisma.message.count({ where: { recipientId: userId, readAt: null } })
  },
}
