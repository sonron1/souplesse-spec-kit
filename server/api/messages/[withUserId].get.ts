import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/messages/:withUserId
 * Returns all messages in the conversation between the current user
 * and the given user. Also marks them as read for the caller.
 *
 * The route resolves coachId/clientId automatically via the assignment table.
 */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)
  const withUserId = getRouterParam(event, 'withUserId')!

  const { coachId, clientId } = await resolveConversation(me.id, me.role, withUserId)
  const messages = await messageService.getConversation(coachId, clientId, me.id)

  return { messages, coachId, clientId }
})

async function resolveConversation(meId: string, meRole: string, otherId: string) {
  if (meRole === 'COACH') {
    // Verify assignment exists
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { coachId: meId, clientId: otherId },
    })
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Assignation introuvable.' })
    }
    return { coachId: meId, clientId: otherId }
  }

  // CLIENT — otherId must be their assigned coach
  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { coachId: otherId, clientId: meId },
  })
  if (!assignment) {
    throw createError({ statusCode: 404, message: 'Vous n\'avez pas de coach assigné.' })
  }
  return { coachId: otherId, clientId: meId }
}
