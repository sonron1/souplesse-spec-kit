import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { notificationService } from '../../services/notification.service'

/**
 * GET /api/notifications
 * Returns notifications for the authenticated user.
 * ?unread=true   → only unread
 * ?limit=N       → max results (default 20)
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)))
  const unreadOnly = query.unread === 'true'

  const [notifications, unreadCount] = await Promise.all([
    notificationService.getForUser(user.sub, limit, unreadOnly),
    notificationService.countUnread(user.sub),
  ])

  return { notifications, unreadCount }
})
