import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'
import { prisma } from '../../../utils/prisma'
import logger from '../../../utils/logger'

const PatchUserSchema = z.object({
  role: z.enum(['CLIENT', 'COACH', 'ADMIN']),
})

/**
 * PATCH /api/admin/users/:id
 * Change a user's role (ADMIN only).
 */
export default defineEventHandler(async (event) => {
  const requestingUser = requireAuth(event)
  requireAdmin(requestingUser)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant utilisateur manquant' })

  // Prevent self-demotion
  if (id === requestingUser.sub) {
    throw createError({ statusCode: 400, statusMessage: 'Vous ne pouvez pas modifier votre propre rôle' })
  }

  const body = await readBody(event)
  const parsed = PatchUserSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Le rôle doit être CLIENT, COACH ou ADMIN' })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })

  const updated = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  })

  logger.info({ targetId: id, newRole: parsed.data.role, by: requestingUser.sub }, 'User role updated')
  return { success: true, user: updated }
})
