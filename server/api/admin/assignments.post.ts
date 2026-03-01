import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../middleware/admin.middleware'
import logger from '../../utils/logger'

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
      statusMessage: 'Invalid payload: coachId and clientId (UUID) required',
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
      statusMessage: 'coachId must reference a user with role COACH',
    })
  }
  if (!client || client.role !== 'CLIENT') {
    throw createError({
      statusCode: 422,
      statusMessage: 'clientId must reference a user with role CLIENT',
    })
  }

  // Upsert — idempotent: re-assigning the same pair is safe
  const assignment = await prisma.coachClientAssignment.upsert({
    where: { coachId_clientId: { coachId, clientId } },
    create: { coachId, clientId },
    update: {}, // no fields to change on a duplicate
  })

  logger.info({ assignmentId: assignment.id, coachId, clientId }, 'Coach-client assignment created')
  return { ok: true, assignment }
})
