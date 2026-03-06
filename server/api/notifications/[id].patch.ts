import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { notificationService } from '../../services/notification.service'

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read for the current user.
 * Body: {} (empty) — the id comes from the URL param.
 * Also accepts ?all=true as a shorthand to mark all notifications read.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = event.context.params?.id

  if (id === 'all') {
    const count = await notificationService.markAllRead(user.sub)
    return { ok: true, count }
  }

  if (!id) throw createError({ statusCode: 400, message: 'Identifiant de notification manquant' })

  const updated = await notificationService.markRead(id, user.sub)
  if (!updated) throw createError({ statusCode: 404, message: 'Notification introuvable' })

  return { ok: true, notification: updated }
})
