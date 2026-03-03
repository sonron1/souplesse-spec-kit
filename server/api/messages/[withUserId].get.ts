import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/messages/:withUserId
 * Returns all messages in the conversation thread between the current user
 * and the given user. Marks them as read for the caller.
 *
 * - ADMIN ↔ COACH : direct thread (clientId = null)
 * - COACH ↔ CLIENT: standard assignment-based thread
 * - COACH ↔ ADMIN : direct thread (clientId = null)
 */
export default defineEventHandler(async (event) => {
  const me = requireAuth(event)
  const withUserId = getRouterParam(event, 'withUserId')!

  const other = await prisma.user.findUnique({ where: { id: withUserId } })
  if (!other) throw createError({ statusCode: 404, message: 'Utilisateur introuvable.' })

  // Admin ↔ Coach direct thread
  if (me.role === 'ADMIN' && other.role === 'COACH') {
    const messages = await messageService.getDirectThread(withUserId, me.sub)
    return { messages, coachId: withUserId, clientId: null }
  }

  // Coach ↔ Admin direct thread
  if (me.role === 'COACH' && other.role === 'ADMIN') {
    const messages = await messageService.getDirectThread(me.sub, me.sub)
    return { messages, coachId: me.sub, clientId: null }
  }

  // Coach ↔ Client standard thread
  if (me.role === 'COACH') {
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { coachId: me.sub, clientId: withUserId, status: 'ACCEPTED' },
    })
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Ce client ne vous est pas assigné.' })
    }
    const messages = await messageService.getConversation(me.sub, withUserId, me.sub)
    return { messages, coachId: me.sub, clientId: withUserId }
  }

  // Client ↔ Coach thread
  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { coachId: withUserId, clientId: me.sub, status: 'ACCEPTED' },
  })
  if (!assignment) {
    throw createError({ statusCode: 404, message: 'Vous n\'avez pas de coach assigné accepté.' })
  }
  const messages = await messageService.getConversation(withUserId, me.sub, me.sub)
  return { messages, coachId: withUserId, clientId: me.sub }
})

