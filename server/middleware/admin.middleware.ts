import { verifyJwt } from '../utils/jwt'
import { defineEventHandler, getHeader, createError } from 'h3'

export async function requireAdmin(event: any) {
  const auth = event.node?.req?.headers?.authorization || getHeader(event, 'authorization')
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Authorization required' })
  }
  const token = auth.replace(/^Bearer\s+/i, '')
  let payload
  try {
    payload = verifyJwt(token)
  } catch (err) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  if (!payload || payload.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  // attach auth info to event.context for downstream handlers
  if (!event.context) event.context = {}
  event.context.user = payload
  return payload
}

// Nitro middleware default export
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
})
