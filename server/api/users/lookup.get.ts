import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireRole } from '../../utils/role'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/users/lookup?email=xxx
 * GET /api/users/lookup?firstName=X&lastName=Y
 *
 * Returns minimal info (name, gender, email) for a CLIENT user to display in partner selectors.
 * Only accessible to authenticated CLIENTs.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireRole(user, 'CLIENT')

  const { email, phone, firstName, lastName } = getQuery(event) as {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
  }

  let found
  if (phone) {
    // Phone-based lookup (L003)
    const normalised = phone.trim()
    found = await prisma.user.findUnique({
      where: { phone: normalised },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, role: true },
    })
  } else if (firstName || lastName) {
    // Name-based lookup (case-insensitive, trimmed)
    const first = (firstName ?? '').trim()
    const last = (lastName ?? '').trim()
    if (!first && !last) {
      throw createError({ statusCode: 400, message: 'Prénom ou nom requis' })
    }
    found = await prisma.user.findFirst({
      where: {
        role: 'CLIENT',
        ...(first && last
          ? { firstName: { equals: first, mode: 'insensitive' }, lastName: { equals: last, mode: 'insensitive' } }
          : first
            ? { firstName: { equals: first, mode: 'insensitive' } }
            : { lastName: { equals: last, mode: 'insensitive' } }),
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, role: true },
    })
  } else if (email) {
    // Email-based lookup
    const normalised = email.toLowerCase().trim()
    found = await prisma.user.findUnique({
      where: { email: normalised },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, gender: true, role: true },
    })
  } else {
    throw createError({ statusCode: 400, message: 'Email, téléphone, prénom ou nom requis' })
  }

  if (!found || found.role !== 'CLIENT') {
    throw createError({ statusCode: 404, message: 'Aucun compte client trouvé.' })
  }

  // Prevent self-selection
  if (found.email?.toLowerCase() === user.email?.toLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: 'self_partner', message: 'Vous ne pouvez pas vous désigner comme partenaire.' })
  }

  return {
    found: true,
    name: [found.firstName, found.lastName].filter(Boolean).join(' ') || 'Client',
    gender: found.gender,
    email: found.email,
  }
})

