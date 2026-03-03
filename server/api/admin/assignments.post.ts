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

  // Upsert — idempotent: re-assigning the same pair is safe
  const assignment = await prisma.coachClientAssignment.upsert({
    where: { coachId_clientId: { coachId, clientId } },
    create: { coachId, clientId },
    update: {}, // no fields to change on a duplicate
  })

  logger.info({ assignmentId: assignment.id, coachId, clientId }, 'Coach-client assignment created')
  systemLog({ action: 'COACH_ASSIGNED', target: assignment.id, message: `Coach ${coachId} assigned to client ${clientId}` })

  // Notify the client that a coach has been assigned to them
  notificationService.create({
    userId: clientId,
    type: 'ASSIGNMENT',
    title: 'Un coach vous a été assigné',
    body: `${coach.name} est maintenant votre coach personnel. Retrouvez-le dans votre espace programmes.`,
  }).catch((err) => logger.error({ err }, 'Failed to create assignment notification'))

  return { ok: true, assignment }
})
