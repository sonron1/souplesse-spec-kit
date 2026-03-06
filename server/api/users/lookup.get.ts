import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/users/lookup?email=xxx
 * Returns minimal info (name, gender) for a CLIENT user to display in partner selectors.
 * Only accessible to authenticated CLIENTs.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'CLIENT')

  const { email } = getQuery(event) as { email?: string }
  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, message: 'Email requis' })
  }

  const normalised = email.toLowerCase().trim()
  if (normalised === user.email?.toLowerCase().trim()) {
    throw createError({ statusCode: 400, statusMessage: 'self_partner', message: 'Vous ne pouvez pas vous désigner comme partenaire.' })
  }

  const found = await prisma.user.findUnique({
    where: { email: normalised },
    select: { id: true, firstName: true, lastName: true, gender: true, role: true },
  })

  if (!found || found.role !== 'CLIENT') {
    throw createError({ statusCode: 404, message: 'Aucun compte client trouvé pour cet email.' })
  }

  return {
    found: true,
    name: [found.firstName, found.lastName].filter(Boolean).join(' ') || 'Client',
    gender: found.gender,
  }
})
