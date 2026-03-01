import { prisma } from '../utils/prisma'
import type { Booking } from '@prisma/client'

export const bookingRepository = {
  async findById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({ where: { id } })
  },

  async findByUserAndSession(userId: string, sessionId: string): Promise<Booking | null> {
    return prisma.booking.findUnique({ where: { userId_sessionId: { userId, sessionId } } })
  },

  async findByUser(userId: string): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: { userId },
      include: { session: true },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(data: { userId: string; sessionId: string }): Promise<Booking> {
    return prisma.booking.create({ data })
  },

  async cancel(id: string): Promise<Booking> {
    return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } })
  },
}
