import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { messageService } from '../../services/message.service'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/messages/:withUserId
 * Returns all messages in the conversation thread between the current user
 * and the given user. Marks them as read for the caller.
 *
 * Optional query params:
 *   page=1&limit=50 — paginate messages (O004)
 *
 * - ADMIN ↔ COACH : direct thread (clientId = null)
 * - COACH ↔ CLIENT: standard assignment-based thread
 * - COACH ↔ ADMIN : direct thread (clientId = null)
 */
export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)
  const withUserId = getRouterParam(event, 'withUserId')!
  const query = getQuery(event)
  const page = query.page ? Math.max(1, parseInt(String(query.page), 10)) : undefined
  const limit = query.limit ? Math.min(200, Math.max(1, parseInt(String(query.limit), 10))) : undefined
  const paginationOpts = (page !== undefined && limit !== undefined) ? { page, limit } : undefined

  const other = await prisma.user.findUnique({ where: { id: withUserId } })
  if (!other) throw createError({ statusCode: 404, message: 'Utilisateur introuvable.' })

  function unpack(result: Awaited<ReturnType<typeof messageService.getConversation>>) {
    if ('messages' in result) return { messages: result.messages, pagination: result.pagination }
    return { messages: result, pagination: undefined }
  }

  // Admin ↔ Coach direct thread
  if (me.role === 'ADMIN' && other.role === 'COACH') {
    const raw = await messageService.getDirectThread(withUserId, me.sub, paginationOpts)
    const { messages, pagination } = unpack(raw)
    return { messages, coachId: withUserId, clientId: null, ...(pagination ? { pagination } : {}) }
  }

  // Coach ↔ Admin direct thread
  if (me.role === 'COACH' && other.role === 'ADMIN') {
    const raw = await messageService.getDirectThread(me.sub, me.sub, paginationOpts)
    const { messages, pagination } = unpack(raw)
    return { messages, coachId: me.sub, clientId: null, ...(pagination ? { pagination } : {}) }
  }

  // Coach ↔ Client standard thread
  if (me.role === 'COACH') {
    const assignment = await prisma.coachClientAssignment.findFirst({
      where: { coachId: me.sub, clientId: withUserId, status: 'ACCEPTED' },
    })
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Ce client ne vous est pas assigné.' })
    }
    const raw = await messageService.getConversation(me.sub, withUserId, me.sub, paginationOpts)
    const { messages, pagination } = unpack(raw)
    return { messages, coachId: me.sub, clientId: withUserId, ...(pagination ? { pagination } : {}) }
  }

  // Client ↔ Coach thread
  const assignment = await prisma.coachClientAssignment.findFirst({
    where: { coachId: withUserId, clientId: me.sub, status: 'ACCEPTED' },
  })
  if (!assignment) {
    throw createError({ statusCode: 404, message: 'Vous n\'avez pas de coach assigné accepté.' })
  }
  const raw = await messageService.getConversation(withUserId, me.sub, me.sub, paginationOpts)
  const { messages, pagination } = unpack(raw)
  return { messages, coachId: withUserId, clientId: me.sub, ...(pagination ? { pagination } : {}) }
})

