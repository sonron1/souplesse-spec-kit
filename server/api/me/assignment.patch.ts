import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'
import { logger } from '../../utils/logger'
import { notificationService } from '../../services/notification.service'
import { messageService } from '../../services/message.service'
import { systemLog } from '../../utils/systemLog'

const bodySchema = z.object({
  action: z.enum(['ACCEPT', 'REFUSE'], { message: 'action doit être ACCEPT ou REFUSE' }),
})

/**
 * PATCH /api/me/assignment
 * CLIENT only — accept or refuse their pending coach assignment.
 *
 * ACCEPT → status becomes ACCEPTED; coach + admin are notified.
 * REFUSE → status becomes REJECTED; admin is notified via message + notification.
 */
export default defineEventHandler(async (event) => {
  const me = requireAuth(event)

  if (me.role !== 'CLIENT') {
    throw createError({ statusCode: 403, message: 'Réservé aux clients.' })
  }

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }
  const { action } = parsed.data

  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { clientId: me.sub, status: 'PENDING' },
    include: {
      coach: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  if (!assignment) {
    throw createError({ statusCode: 404, message: 'Aucune assignation en attente trouvée.' })
  }

  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'

  await prisma.coachClientAssignment.update({
    where: { id: assignment.id },
    data: { status: newStatus, respondedAt: new Date() },
  })

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })

  if (action === 'ACCEPT') {
    // Notify coach
    notificationService.create({
      userId: assignment.coach.id,
      type: 'ASSIGNMENT_ACCEPTED',
      title: 'Assignation acceptée',
      body: `${assignment.client.name} a accepté votre coaching. Vous pouvez maintenant lui envoyer des messages.`,
    }).catch((err: unknown) => logger.error({ err }, 'Erreur notification coach'))

    // Notify admins
    await Promise.all(admins.map((admin: { id: string }) =>
      notificationService.create({
        userId: admin.id,
        type: 'ASSIGNMENT_ACCEPTED',
        title: 'Assignation acceptée',
        body: `${assignment.client.name} a accepté d'être suivi par le coach ${assignment.coach.name}.`,
      }).catch((err: unknown) => logger.error({ err }, 'Erreur notification admin'))
    ))

    // Send admin a direct message from the coach's thread
    for (const admin of admins) {
      await messageService.sendDirectMessage({
        senderId: assignment.coach.id,
        recipientId: admin.id,
        coachId: assignment.coach.id,
        body: `ℹ️ ${assignment.client.name} a accepté l'assignation avec le coach ${assignment.coach.name}.`,
        senderRole: 'COACH',
      }).catch((err: unknown) => logger.error({ err }, 'Erreur message direct admin (ACCEPT)'))
    }

    logger.info({ assignmentId: assignment.id }, 'Client a accepté le coach')
    systemLog({ action: 'ASSIGNMENT_ACCEPTED', target: assignment.id, message: `Client ${me.sub} a accepté le coach ${assignment.coachId}` })
  } else {
    // REFUSE — notify admins
    await Promise.all(admins.map((admin: { id: string }) =>
      notificationService.create({
        userId: admin.id,
        type: 'ASSIGNMENT_REFUSED',
        title: 'Assignation refusée',
        body: `${assignment.client.name} a refusé d'être suivi par le coach ${assignment.coach.name}.`,
      }).catch((err: unknown) => logger.error({ err }, 'Erreur notification admin'))
    ))

    // Send admin a direct message
    for (const admin of admins) {
      await messageService.sendDirectMessage({
        senderId: assignment.coach.id,
        recipientId: admin.id,
        coachId: assignment.coach.id,
        body: `❌ ${assignment.client.name} a refusé l'assignation avec le coach ${assignment.coach.name}.`,
        senderRole: 'COACH',
      }).catch((err: unknown) => logger.error({ err }, 'Erreur message direct admin (REFUSE)'))
    }

    logger.info({ assignmentId: assignment.id }, 'Client a refusé le coach')
    systemLog({ action: 'ASSIGNMENT_REFUSED', target: assignment.id, message: `Client ${me.sub} a refusé le coach ${assignment.coachId}` })
  }

  return { ok: true, status: newStatus }
})
