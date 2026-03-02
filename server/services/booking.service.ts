import { prisma } from '../utils/prisma'
import { Prisma, DayOfWeek } from '@prisma/client'
import { bookingRepository } from '../repositories/booking.repository'
import { subscriptionService } from './subscription.service'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Booking } from '.prisma/client'

/** Maps JavaScript Date.getDay() (0=Sun) to Prisma DayOfWeek enum values */
const JS_DAY_TO_ENUM: Record<number, DayOfWeek> = {
  0: 'SUNDAY' as DayOfWeek,
  1: 'MONDAY' as DayOfWeek,
  2: 'TUESDAY' as DayOfWeek,
  3: 'WEDNESDAY' as DayOfWeek,
  4: 'THURSDAY' as DayOfWeek,
  5: 'FRIDAY' as DayOfWeek,
  6: 'SATURDAY' as DayOfWeek,
}

export const bookingService = {
  /**
   * Book a session slot for a user.
   *
   * Rules:
   * 1. User must have an active subscription.
   * 2. Session must exist and have capacity remaining.
   * 3. User must not already have a CONFIRMED booking for this session.
   * 4. Session must fall within BusinessHours for that day (FR-013).
   * Capacity check is done atomically via a DB transaction.
   */
  async bookSession(userId: string, sessionId: string): Promise<Booking> {
    // 1. Check active subscription
    const hasActive = await subscriptionService.hasActiveSubscription(userId)
    if (!hasActive) {
      throw createError({
        statusCode: 403,
        statusMessage: 'An active subscription is required to book a session',
      })
    }

    // 2. Check for duplicate booking
    const existing = await bookingRepository.findByUserAndSession(userId, sessionId)
    if (existing && existing.status === 'CONFIRMED') {
      throw createError({
        statusCode: 409,
        statusMessage: 'You already have a booking for this session',
      })
    }

    // 3. Atomic capacity check via transaction
    const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const session = await tx.session.findUnique({ where: { id: sessionId } })
      if (!session) {
        throw createError({ statusCode: 404, statusMessage: 'Session not found' })
      }

      const booked = await tx.booking.count({ where: { sessionId, status: 'CONFIRMED' } })
      if (booked >= session.capacity) {
        throw createError({ statusCode: 409, statusMessage: 'Session is fully booked' })
      }

      // 4. BusinessHours validation (FR-013)
      const dayEnum = JS_DAY_TO_ENUM[session.dateTime.getDay()]
      const hours = await tx.businessHours.findFirst({
        where: { dayOfWeek: dayEnum },
      })
      if (hours) {
        const sessionTime = session.dateTime.toTimeString().slice(0, 5)
        if (sessionTime < hours.openTime || sessionTime >= hours.closeTime) {
          throw createError({
            statusCode: 422,
            statusMessage: `Session is outside business hours (${hours.openTime}â€“${hours.closeTime})`,
          })
        }
      }

      return tx.booking.create({ data: { userId, sessionId } })
    })

    logger.info({ bookingId: booking.id, userId, sessionId }, 'Session booked')
    return booking
  },
}
