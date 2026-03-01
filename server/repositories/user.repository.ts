import { prisma } from '../utils/prisma'
import type { User, UserRole } from '.prisma/client'

export type CreateUserInput = {
  name: string
  email: string
  passwordHash: string
  role?: UserRole
}

export type UpdateUserInput = Partial<{
  name: string
  passwordHash: string
  refreshToken: string | null
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
}
