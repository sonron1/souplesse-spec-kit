import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/admin.middleware'
import { prisma } from '../../utils/prisma'
import { logger } from '../../utils/logger'
import { notificationService } from '../../services/notification.service'
import { systemLog } from '../../utils/systemLog'

const bodySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { message: 'action doit être APPROVE ou REJECT' }),
})

/**
 * PATCH /api/admin/assignments/:id
 * Admin only — approve or reject a pending client coach request.
 *
 * APPROVE → sets status to ACCEPTED, notifies coach + client.
 * REJECT  → sets status to REJECTED, notifies client.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')!
  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }
  const { action } = parsed.data

  const assignment = await prisma.coachClientAssignment.findUnique({
    where: { id },
    include: {
      coach: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  if (!assignment) throw createError({ statusCode: 404, message: 'Assignation introuvable.' })

  const newStatus = action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED'

  await prisma.coachClientAssignment.update({
    where: { id },
    data: { status: newStatus, respondedAt: new Date() },
  })

  if (action === 'APPROVE') {
    // Notify client
    notificationService.create({
      userId: assignment.client.id,
      type: 'ASSIGNMENT_ACCEPTED',
      title: 'Demande de coach confirmée',
      body: `Votre demande a été confirmée. ${assignment.coach.name} est maintenant votre coach. Vous pouvez maintenant lui envoyer des messages.`,
    }).catch((err: unknown) => logger.error({ err }, 'Erreur notification client'))

    // Notify coach
    notificationService.create({
      userId: assignment.coach.id,
      type: 'ASSIGNMENT_ACCEPTED',
      title: 'Nouveau client assigné',
      body: `${assignment.client.name} vous a été officiellement assigné suite à sa demande.`,
    }).catch((err: unknown) => logger.error({ err }, 'Erreur notification coach'))

    logger.info({ id }, 'Admin a approuvé une demande de coach')
    systemLog({ action: 'ASSIGNMENT_APPROVED', target: id, message: `Admin a approuvé l'assignation ${id}` })
  } else {
    // Notify client
    notificationService.create({
      userId: assignment.client.id,
      type: 'ASSIGNMENT_REFUSED',
      title: 'Demande de coach refusée',
      body: `Votre demande pour être suivi par ${assignment.coach.name} n'a pas pu être acceptée. Vous pouvez en faire une nouvelle.`,
    }).catch((err: unknown) => logger.error({ err }, 'Erreur notification client'))

    logger.info({ id }, 'Admin a rejeté une demande de coach')
    systemLog({ action: 'ASSIGNMENT_REJECTED', target: id, message: `Admin a rejeté l'assignation ${id}` })
  }

  return { ok: true, status: newStatus }
})
