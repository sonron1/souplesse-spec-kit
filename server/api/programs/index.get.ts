import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { programService } from '../../services/program.service'
import { createError } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const clientId = query.clientId as string | undefined

  // Coaches and admins can query any client; clients can only query themselves
  const targetClientId = clientId ?? user.sub
  if (user.role === 'CLIENT' && targetClientId !== user.sub) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez consulter que vos propres programmes',
    })
  }

  // For coaches with no clientId filter, return ALL their programs with client info
  if ((user.role === 'COACH' || user.role === 'ADMIN') && !clientId) {
    const programs = await prisma.program.findMany({
      where: { coachId: user.sub },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, programs }
  }

  const programs = await programService.getProgramsByClient(targetClientId)
  return { success: true, programs }
})
