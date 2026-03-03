import { H3Event } from 'h3'
import { verifyJwt } from '../utils/jwt'
import { defineEventHandler, getHeader, createError } from 'h3'

export async function requireAdmin(event: H3Event) {
  const auth = event.node?.req?.headers?.authorization || getHeader(event, 'authorization')
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Autorisation requise' })
  }
  const token = auth.replace(/^Bearer\s+/i, '')
  let payload
  try {
    payload = verifyJwt(token)
  } catch (err) {
    throw createError({ statusCode: 401, message: 'Token invalide' })
  }

  if (!payload || payload.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  // attach auth info to event.context for downstream handlers
  if (!event.context) event.context = {}
  event.context.user = payload
  return payload
}

// Nitro requires a default export from files in server/middleware/.
// Admin auth is enforced explicitly per-route via requireAdmin() above.
export default defineEventHandler((_event) => {
  // intentional no-op — do not block non-admin routes here
})
