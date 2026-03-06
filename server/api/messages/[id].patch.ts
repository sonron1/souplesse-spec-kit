import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.middleware'
import { prisma } from '../../utils/prisma'

const bodySchema = z.object({
  body: z.string().min(1, 'Le message ne peut pas être vide.').max(2000),
})

const EDIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Message id required' })

  const message = await prisma.message.findUnique({ where: { id } })
  if (!message) throw createError({ statusCode: 404, message: 'Message introuvable' })
  if (message.senderId !== user.sub) {
    throw createError({ statusCode: 403, message: 'Vous ne pouvez modifier que vos propres messages' })
  }

  const elapsed = Date.now() - message.createdAt.getTime()
  if (elapsed > EDIT_WINDOW_MS) {
    throw createError({ statusCode: 403, message: 'La fenêtre de modification (15 min) est dépassée' })
  }

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { body: parsed.data.body, editedAt: new Date() },
  })

  return { success: true, message: updated }
})
