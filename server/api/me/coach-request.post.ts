import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'
import { logger } from '../../utils/logger'
import { notificationService } from '../../services/notification.service'
import { systemLog } from '../../utils/systemLog'

const bodySchema = z.object({
  coachId: z.string().uuid('ID coach invalide'),
})

/**
 * POST /api/me/coach-request
 * CLIENT only — request a specific coach.
 * Creates a PENDING assignment (requestedBy='client').
 * Notifies all admins.
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
  const { coachId } = parsed.data

  // Ensure coach exists
  const coach = await prisma.user.findUnique({ where: { id: coachId } })
  if (!coach || coach.role !== 'COACH') {
    throw createError({ statusCode: 404, message: 'Coach introuvable.' })
  }

  // Block if client already has an active or pending assignment
  const existing = await prisma.coachClientAssignment.findFirst({
    where: { clientId: me.sub, status: { in: ['PENDING', 'ACCEPTED'] } },
    include: { coach: { select: { name: true } } },
  })
  if (existing) {
    const statusLabel = existing.status === 'ACCEPTED' ? 'actif' : 'en attente'
    throw createError({
      statusCode: 409,
      message: `Vous avez déjà un coach ${statusLabel} (${existing.coach.name}). Refusez ou attendez la fin de l'assignation actuelle pour en demander un autre.`,
    })
  }

  const me_user = await prisma.user.findUnique({ where: { id: me.sub }, select: { name: true } })

  // Create PENDING assignment (client-initiated)
  const assignment = await prisma.coachClientAssignment.create({
    data: { coachId, clientId: me.sub, status: 'PENDING', requestedBy: 'client' },
  })

  logger.info({ assignmentId: assignment.id, coachId, clientId: me.sub }, 'Demande de coach créée par le client')
  systemLog({ action: 'COACH_REQUESTED', target: assignment.id, message: `Client ${me.sub} a demandé le coach ${coachId}` })

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  await Promise.all(admins.map((admin: { id: string }) =>
    notificationService.create({
      userId: admin.id,
      type: 'COACH_REQUEST',
      title: 'Demande de coach',
      body: `${me_user?.name ?? 'Un client'} souhaite être suivi par ${coach.name}. Confirmez ou refusez la demande depuis la gestion des assignations.`,
    }).catch((err: unknown) => logger.error({ err }, 'Erreur notification admin'))
  ))

  return { ok: true, assignment }
})
