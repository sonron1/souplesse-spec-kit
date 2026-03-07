import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'

/**
 * GET /api/auth/session
 *
 * Lightweight session-validity heartbeat endpoint.
 * Used by the default layout every 30 s to detect when a session has been
 * revoked (another device logged in). Returns 200 if the session is still
 * valid; 401 session_revoked if another login superseded this session.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return { valid: true }
})
