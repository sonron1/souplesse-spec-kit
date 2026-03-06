import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'
import { userRepository } from '../../repositories/user.repository'
import { prisma } from '../../utils/prisma'
import logger from '../../utils/logger'

const schema = z.object({
  name: z.string().min(2, 'Nom trop court').max(80),
  email: z.string().email('Email invalide').toLowerCase().trim(),
  password: z.string().min(8, 'Mot de passe trop court').optional(),
  role: z.enum(['CLIENT', 'COACH']).default('CLIENT'),
})

const BCRYPT_ROUNDS = 12

/**
 * POST /api/admin/users
 * Admin creates a new user (CLIENT or COACH).
 * - Auto-generates a password if none provided.
 * - Sets emailVerified = true (admin-created accounts bypass verification).
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAuth(event)
  requireAdmin(admin)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message ?? 'Données invalides' })
  }

  const { name, email, password, role } = parsed.data

  const existing = await userRepository.findByEmail(email)
  if (existing) {
    throw createError({ statusCode: 409, message: 'Cette adresse email est déjà utilisée.' })
  }

  const rawPassword = password ?? generatePassword()
  const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS)

  const user = await userRepository.create({
    name,
    email,
    passwordHash,
    role,
    emailVerificationToken: undefined,
  })

  // Mark email as verified and set emailVerified = true
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  })

  await prisma.systemLog.create({
    data: {
      action: 'ADMIN_CREATE_USER',
      userId: admin.sub,
      message: `Admin created ${role} account for ${email}`,
    },
  })

  logger.info({ adminId: admin.sub, userId: user.id, role }, 'Admin created user')

  const safe = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
  return { ok: true, user: safe, generatedPassword: password ? undefined : rawPassword }
})

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
