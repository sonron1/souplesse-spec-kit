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
    opts: { page?: number; limit?: number; from?: Date; to?: Date } = {}
  ): Promise<SessionWithMeta[]> {
    const { page = 1, limit = 20, from, to } = opts
    return prisma.session.findMany({
      where: {
        dateTime: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dateTime: 'asc' },
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
}
