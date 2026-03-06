import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'
import { prisma } from '../../../utils/prisma'
import logger from '../../../utils/logger'
import { systemLog } from '../../../utils/systemLog'

/**
 * DELETE /api/admin/users/:id
 * Permanently removes a user and all related data (ADMIN only).
 * An admin cannot delete their own account.
 */
export default defineEventHandler(async (event) => {
  const requestingUser = await requireAuth(event)
  requireAdmin(requestingUser)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant utilisateur manquant' })

  if (id === requestingUser.sub) {
    throw createError({ statusCode: 400, message: 'Vous ne pouvez pas supprimer votre propre compte' })
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } })
  if (!target) throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })

  // Manual cascade — delete related records in dependency order
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { OR: [{ senderId: id }, { recipientId: id }] } }),
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.booking.deleteMany({ where: { userId: id } }),
    prisma.coachClientAssignment.deleteMany({ where: { OR: [{ coachId: id }, { clientId: id }] } }),
    prisma.program.deleteMany({ where: { OR: [{ coachId: id }, { clientId: id }] } }),
    prisma.session.deleteMany({ where: { coachId: id } }),
    prisma.subscription.deleteMany({ where: { userId: id } }),
    prisma.paymentOrder.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ])

  logger.info({ targetId: id, targetEmail: target.email, by: requestingUser.sub }, 'User deleted by admin')
  systemLog({ action: 'USER_DELETED', userId: requestingUser.sub, target: target.email, message: `Admin deleted user ${target.email}` })

  return { success: true, message: `Utilisateur ${target.name} supprimé.` }
})
