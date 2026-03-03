import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../middleware/admin.middleware'
import logger from '../../utils/logger'
import { systemLog } from '../../utils/systemLog'
import { notificationService } from '../../services/notification.service'

const AssignCoachSchema = z.object({
  coachId: z.string().uuid(),
  clientId: z.string().uuid(),
})

/**
 * POST /api/admin/assignments
 * Admin-only: assign a coach to a client.
 * Creates a CoachClientAssignment record (unique on coachId+clientId).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const parsed = AssignCoachSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides : coachId et clientId (UUID) requis',
    })
  }

  const { coachId, clientId } = parsed.data

  // Verify both users exist and have the expected roles
  const [coach, client] = await Promise.all([
    prisma.user.findUnique({ where: { id: coachId } }),
    prisma.user.findUnique({ where: { id: clientId } }),
  ])

  if (!coach || coach.role !== 'COACH') {
    throw createError({
      statusCode: 422,
      message: 'Le coachId doit référencer un utilisateur avec le rôle COACH',
    })
  }
  if (!client || client.role !== 'CLIENT') {
    throw createError({
      statusCode: 422,
      message: 'Le clientId doit référencer un utilisateur avec le rôle CLIENT',
    })
  }

  // Upsert — if previously REJECTED, reactivate as PENDING; otherwise create fresh
  const existing = await prisma.coachClientAssignment.findFirst({
    where: { clientId },
  })

  let assignment
  if (existing) {
    assignment = await prisma.coachClientAssignment.update({
      where: { id: existing.id },
      data: { coachId, status: 'PENDING', requestedBy: 'admin', respondedAt: null },
    })
  } else {
    assignment = await prisma.coachClientAssignment.create({
      data: { coachId, clientId, status: 'PENDING', requestedBy: 'admin' },
    })
  }

  logger.info({ assignmentId: assignment.id, coachId, clientId }, 'Proposition de coach créée par admin (PENDING)')
  systemLog({ action: 'COACH_ASSIGNED', target: assignment.id, message: `Admin a proposé le coach ${coachId} au client ${clientId}` })

  // Notify the client they have a pending coach proposal
  notificationService.create({
    userId: clientId,
    type: 'ASSIGNMENT',
    title: 'Proposition de coach',
    body: `${coach.name} vous a été proposé comme coach. Rendez-vous dans votre espace pour accepter ou refuser.`,
  }).catch((err: unknown) => logger.error({ err }, 'Erreur notification assignation'))

  return { ok: true, assignment }
})
