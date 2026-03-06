import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'
import { prisma } from '../../../utils/prisma'
import logger from '../../../utils/logger'
import { systemLog } from '../../../utils/systemLog'

const PatchUserSchema = z.object({
  role: z.enum(['CLIENT', 'COACH', 'ADMIN']).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
}).refine((d) => d.role !== undefined || d.name !== undefined || d.email !== undefined, {
  message: 'Au moins un champ (role, name ou email) est requis',
})

/**
 * PATCH /api/admin/users/:id
 * Edit a user's role, name, or email (ADMIN only).
 */
export default defineEventHandler(async (event) => {
  const requestingUser = await requireAuth(event)
  requireAdmin(requestingUser)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant utilisateur manquant' })

  // Prevent self-demotion of role only
  const body = await readBody(event)
  const parsed = PatchUserSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }

  if (parsed.data.role && id === requestingUser.sub) {
    throw createError({ statusCode: 400, message: 'Vous ne pouvez pas modifier votre propre rôle' })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })

  // Check email uniqueness if changing email
  if (parsed.data.email && parsed.data.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (existing) throw createError({ statusCode: 409, message: 'Cette adresse email est déjà utilisée' })
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.role)  updateData.role  = parsed.data.role
  if (parsed.data.name)  updateData.name  = parsed.data.name.trim()
  if (parsed.data.email) updateData.email = parsed.data.email.toLowerCase().trim()

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  })

  logger.info({ targetId: id, changes: Object.keys(updateData), by: requestingUser.sub }, 'User updated by admin')
  systemLog({ action: 'USER_UPDATED', userId: requestingUser.sub, target: target.email, message: `Admin updated user ${target.email}: ${Object.keys(updateData).join(', ')}` })
  return { success: true, user: updated }
})
