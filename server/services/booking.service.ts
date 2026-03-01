import { prisma } from '../utils/prisma'
import { Prisma } from '@prisma/client'
import { sessionRepository } from '../repositories/session.repository'
import { bookingRepository } from '../repositories/booking.repository'
import { subscriptionService } from './subscription.service'
import { createError } from 'h3'
import logger from '../utils/logger'
import type { Booking } from '.prisma/client'

/** Maps JavaScript Date.getDay() (0=Sun) to Prisma DayOfWeek enum values */
const JS_DAY_TO_ENUM: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
}

// Cancellations allowed up to this many hours before the session
const CANCELLATION_WINDOW_HOURS = 2

export const bookingService = {
  /**
   * Book a session slot for a user.
   *
   * Rules:
   * 1. User must have an active subscription.
   * 2. Session must exist and have capacity remaining.
   * 3. User must not already have a BOOKED booking for this session.
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
    if (existing && existing.status === 'BOOKED') {
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

      const booked = await tx.booking.count({ where: { sessionId, status: 'BOOKED' } })
      if (booked >= session.capacity) {
        throw createError({ statusCode: 409, statusMessage: 'Session is fully booked' })
      }

      // 4. BusinessHours validation (FR-013)
      const dayEnum = JS_DAY_TO_ENUM[session.dateTime.getDay()]
      const hours = await tx.businessHours.findFirst({
        where: { dayOfWeek: dayEnum as any },
      })
      if (hours) {
        // Session time as "HH:MM" string in local server time — sessions stored UTC
        const sessionTime = session.dateTime.toTimeString().slice(0, 5)
        if (sessionTime < hours.openTime || sessionTime >= hours.closeTime) {
          throw createError({
            statusCode: 422,
            statusMessage: `Session is outside business hours (${hours.openTime}–${hours.closeTime})`,
          })
        }
      }

      return tx.booking.create({ data: { userId, sessionId } })
    })

    logger.info({ bookingId: booking.id, userId, sessionId }, 'Session booked')
    return booking
  },

  /**
   * Cancel a booking.
   *
   * Rules:
   * 1. Only the booking owner can cancel.
   * 2. Cancellation is only allowed within the window before the session.
   */
  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await bookingRepository.findById(bookingId)

    if (!booking) {
      throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
    }
    if (booking.userId !== userId) {
      throw createError({ statusCode: 403, statusMessage: 'Not your booking' })
    }
    if (booking.status === 'CANCELLED') {
      throw createError({ statusCode: 409, statusMessage: 'Booking is already cancelled' })
    }

    // Cancellation window check
    const session = await sessionRepository.findById(booking.sessionId)
    if (session) {
      const now = new Date()
      const windowMs = CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000
      if (session.dateTime.getTime() - now.getTime() < windowMs) {
        throw createError({
          statusCode: 422,
          statusMessage: `Cancellation not allowed within ${CANCELLATION_WINDOW_HOURS} hours of the session`,
        })
      }
    }

    const cancelled = await bookingRepository.cancel(bookingId)
    logger.info({ bookingId, userId }, 'Booking cancelled')
    return cancelled
  },

  /** List all bookings for a user. */
  async getUserBookings(userId: string): Promise<Booking[]> {
    return bookingRepository.findByUser(userId)
  },
}
