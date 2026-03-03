import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'
import { prisma } from '../../utils/prisma'

const bodySchema = z.object({
  toUserId: z.string().uuid('ID destinataire invalide'),
  body: z.string().min(1, 'Le message ne peut pas être vide.').max(2000),
})

/**
 * POST /api/messages
 * Sends a message to another user.
 * CLIENT cannot initiate — throws 403 if the coach has not messaged first.
 */
export default defineEventHandler(async (event) => {
  const me = requireAuth(event)

  // Only clients and coaches can message
  if (me.role === 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Les administrateurs ne peuvent pas envoyer de messages.' })
  }

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }
  const { toUserId, body } = parsed.data

  const { coachId, clientId } = await resolveConversation(me.sub, me.role, toUserId)

  const message = await messageService.sendMessage({
    senderId: me.sub,
    recipientId: toUserId,
    coachId,
    clientId,
    body,
    senderRole: me.role,
  })

  return { message }
})

async function resolveConversation(meId: string, meRole: string, recipientId: string) {
  if (meRole === 'COACH') {
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { coachId: meId, clientId: recipientId },
    })
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Ce client ne vous est pas assigné.' })
    }
    return { coachId: meId, clientId: recipientId }
  }

  // CLIENT — recipientId must be their coach
  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { coachId: recipientId, clientId: meId },
  })
  if (!assignment) {
    throw createError({ statusCode: 404, message: 'Vous n\'avez pas de coach assigné.' })
  }
  return { coachId: recipientId, clientId: meId }
}
