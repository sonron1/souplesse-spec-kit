import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { programService } from '../../services/program.service'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  const clientId = query.clientId as string | undefined

  // Coaches and admins can query any client; clients can only query themselves
  const targetClientId = clientId ?? user.sub
  if (user.role === 'CLIENT' && targetClientId !== user.sub) {
    throw createError({ statusCode: 403, statusMessage: 'Clients may only view their own programs' })
  }

  const programs = await programService.getProgramsByClient(targetClientId)
  return { success: true, programs }
})
