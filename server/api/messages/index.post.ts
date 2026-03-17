import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'
import { prisma } from '../../utils/prisma'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'

const msgRateLimit = rateLimitMiddleware({ max: 30, windowMs: 60_000, keyPrefix: 'msg-send' })

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
  const me = await requireAuth(event)
  await msgRateLimit(event)

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }
  const { toUserId, body } = parsed.data

  // ADMIN → direct thread with a coach
  if (me.role === 'ADMIN') {
    const coach = await prisma.user.findUnique({ where: { id: toUserId } })
    if (!coach || coach.role !== 'COACH') {
      throw createError({ statusCode: 404, message: 'Coach introuvable.' })
    }
    const message = await messageService.sendDirectMessage({
      senderId: me.sub,
      recipientId: toUserId,
      coachId: toUserId,
      body,
      senderRole: me.role,
    })
    return { message }
  }

  // COACH → send to ADMIN (direct thread) or to a CLIENT
  if (me.role === 'COACH') {
    const recipient = await prisma.user.findUnique({ where: { id: toUserId } })
    if (!recipient) throw createError({ statusCode: 404, message: 'Destinataire introuvable.' })

    if (recipient.role === 'ADMIN') {
      const message = await messageService.sendDirectMessage({
        senderId: me.sub,
        recipientId: toUserId,
        coachId: me.sub,
        body,
        senderRole: me.role,
      })
      return { message }
    }

    // COACH → CLIENT
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { coachId: me.sub, clientId: toUserId, status: 'ACCEPTED' },
    })
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Ce client ne vous est pas assigné ou l\'assignation n\'est pas encore acceptée.' })
    }
    const message = await messageService.sendMessage({
      senderId: me.sub,
      recipientId: toUserId,
      coachId: me.sub,
      clientId: toUserId,
      body,
      senderRole: me.role,
    })
    return { message }
  }

  // CLIENT → their accepted coach
  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { coachId: toUserId, clientId: me.sub, status: 'ACCEPTED' },
  })
  if (!assignment) {
    throw createError({ statusCode: 404, message: 'Vous n\'avez pas de coach assigné accepté.' })
  }
  const message = await messageService.sendMessage({
    senderId: me.sub,
    recipientId: toUserId,
    coachId: toUserId,
    clientId: me.sub,
    body,
    senderRole: me.role,
  })
  return { message }
})
