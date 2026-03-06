import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'

/**
 * GET /api/messages
 * Returns the list of conversations for the current user.
 * ADMIN  → all admin↔coach direct threads
 * COACH  → all coach↔client threads + their admin direct thread
 * CLIENT → their assigned coach conversation (if any)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === 'ADMIN') {
    const conversations = await messageService.getAdminCoachConversations(user.sub)
    const unreadTotal = await messageService.countUnread(user.sub)
    return { conversations, unreadTotal }
  }

  const conversations = await messageService.getConversations(user.sub, user.role)
  const unreadTotal = await messageService.countUnread(user.sub)
  return { conversations, unreadTotal }
})
