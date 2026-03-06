import { prisma } from '../utils/prisma'
import type { Session } from '@prisma/client'

export type CreateSessionInput = {
  coachId: string
  dateTime: Date
  duration: number
  capacity: number
  location?: string
}

export type SessionWithMeta = Session & {
  _count: { bookings: number }
  coach: { id: string; name: string } | null
}

export const sessionRepository = {
  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } })
  },

  async findAll(
    opts: { page?: number; limit?: number; from?: Date; to?: Date; order?: 'asc' | 'desc' } = {}
  ): Promise<SessionWithMeta[]> {
    const { page = 1, limit = 20, from, to, order = 'asc' } = opts
    return prisma.session.findMany({
      where: {
        dateTime: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dateTime: order },
      include: {
        _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } },
        coach: { select: { id: true, name: true } },
      },
    }) as Promise<SessionWithMeta[]>
  },

  async create(data: CreateSessionInput): Promise<Session> {
    return prisma.session.create({ data })
  },

  async countAll(opts: { from?: Date; to?: Date } = {}): Promise<number> {
    const { from, to } = opts
    return prisma.session.count({
      where: {
        dateTime: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
    })
  },

  async countBookings(sessionId: string): Promise<number> {
    return prisma.booking.count({ where: { sessionId, status: 'CONFIRMED' } })
  },

  async update(id: string, data: Partial<CreateSessionInput>): Promise<Session> {
    return prisma.session.update({ where: { id }, data })
  },

  async delete(id: string): Promise<Session> {
    return prisma.session.delete({ where: { id } })
  },
}
