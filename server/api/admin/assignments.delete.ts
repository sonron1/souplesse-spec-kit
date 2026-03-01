import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../middleware/admin.middleware'
import logger from '../../utils/logger'

const RemoveAssignmentSchema = z.object({
  coachId: z.string().uuid(),
  clientId: z.string().uuid(),
})

/**
 * DELETE /api/admin/assignments
 * Admin-only: remove a coach-client assignment.
 * Does NOT delete existing programs created under this assignment.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const parsed = RemoveAssignmentSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid payload: coachId and clientId (UUID) required',
    })
  }

  const { coachId, clientId } = parsed.data

  const existing = await prisma.coachClientAssignment.findUnique({
    where: { coachId_clientId: { coachId, clientId } },
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Assignment not found' })
  }

  await prisma.coachClientAssignment.delete({
    where: { coachId_clientId: { coachId, clientId } },
  })

  logger.info({ coachId, clientId }, 'Coach-client assignment removed')
  return { ok: true }
})
