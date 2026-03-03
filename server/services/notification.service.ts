import { prisma } from '../utils/prisma'
import logger from '../utils/logger'

export interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  body: string
}

export const notificationService = {
  /**
   * Create a notification for a user.
   */
  async create(input: CreateNotificationInput) {
    const n = await prisma.notification.create({ data: input })
    logger.info({ notificationId: n.id, userId: input.userId, type: input.type }, 'Notification created')
    return n
  },

  /**
   * Get all notifications for a user, newest first.
   */
  async getForUser(userId: string, limit = 20, unreadOnly = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  /**
   * Count unread notifications for a user.
   */
  async countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } })
  },

  /**
   * Mark a single notification as read.
   */
  async markRead(id: string, userId: string) {
    const n = await prisma.notification.findUnique({ where: { id } })
    if (!n || n.userId !== userId) return null
    if (n.readAt) return n // already read
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
  },

  /**
   * Mark all unread notifications for a user as read.
   */
  async markAllRead(userId: string) {
    const { count } = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
    logger.info({ userId, count }, 'All notifications marked read')
    return count
  },
}
