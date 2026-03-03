import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'

/**
 * GET /api/messages
 * Returns the list of conversations for the current user.
 * COACH → all clients they have exchanged with (unread counts)
 * CLIENT → their assigned coach conversation (if any)
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const conversations = await messageService.getConversations(user.sub, user.role)
  const unreadTotal = await messageService.countUnread(user.sub)
  return { conversations, unreadTotal }
})
