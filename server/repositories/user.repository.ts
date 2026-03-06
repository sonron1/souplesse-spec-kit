import { prisma } from '../utils/prisma'
import type { User, UserRole, Gender } from '.prisma/client'

export type CreateUserInput = {
  name: string
  email: string
  passwordHash: string
  role?: UserRole
  emailVerificationToken?: string
  // Extended profile (v3)
  firstName?: string
  lastName?: string
  phone?: string
  gender?: Gender
  birthDay?: number | null
  birthMonth?: number | null
  avatarUrl?: string | null
  emailVerified?: boolean
}

export type UpdateUserInput = Partial<{
  name: string
  passwordHash: string
  refreshToken: string | null
  loginAttempts: number
  lockedUntil: Date | null
  emailVerified: boolean
  emailVerificationToken: string | null
  // Extended profile (v3)
  firstName: string
  lastName: string
  phone: string | null
  gender: Gender | null
  birthDay: number | null
  birthMonth: number | null
  avatarUrl: string | null
  // Session token (v3)
  sessionToken: string | null
  sessionTokenIssuedAt: Date | null
}>

/**
 * User repository — data-access layer for the User model.
 * All business logic lives in auth.service.ts.
 */
export const userRepository = {
  /** Find a user by their unique ID. */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  /** Find a user by their email address (case-insensitive lookup). */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
  },

  /** Create a new user. */
  async create(data: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
        role: data.role ?? 'CLIENT',
      },
    })
  },

  /** Update a user's mutable fields. */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({ where: { id }, data })
  },

  /** Soft-invalidate the refresh token stored on the user. */
  async clearRefreshToken(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { refreshToken: null } })
  },

  /** Find a user by their email verification token. */
  async findByVerificationToken(token: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { emailVerificationToken: token } })
  },

  /**
   * Increment failed login counter. Locks the account (lockedUntil = now + durationMs)
   * once the attempt count reaches maxAttempts.
   */
  async incrementLoginAttempts(
    id: string,
    maxAttempts = 5,
    lockDurationMs = 15 * 60 * 1000
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id }, select: { loginAttempts: true } })
    const next = (user?.loginAttempts ?? 0) + 1
    const lockedUntil = next >= maxAttempts ? new Date(Date.now() + lockDurationMs) : null
    await prisma.user.update({
      where: { id },
      data: { loginAttempts: next, ...(lockedUntil !== null ? { lockedUntil } : {}) },
    })
  },

  /** Reset login attempt counter and remove lockout after successful login. */
  async resetLoginAttempts(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { loginAttempts: 0, lockedUntil: null },
    })
  },

  /** List all users (admin use; add pagination if needed). */
  async findAll(opts: { page?: number; limit?: number } = {}): Promise<User[]> {
    const { page = 1, limit = 20 } = opts
    return prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  },

  /** Count total users. */
  async count(): Promise<number> {
    return prisma.user.count()
  },

  /** Find a user by their phone number. */
  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } })
  },

  /** Find a user by their active session token. */
  async findBySessionToken(token: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { sessionToken: token } })
  },

  /** Set (or clear) the session token for a user. */
  async updateSessionToken(id: string, token: string | null): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        sessionToken: token,
        sessionTokenIssuedAt: token ? new Date() : null,
      },
    })
  },
}
