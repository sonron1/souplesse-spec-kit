import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../middleware/auth.middleware'
import { requireAdmin } from '../../../utils/role'
import { prisma } from '../../../utils/prisma'

/**
 * GET /api/admin/users/:id
 * Returns full user profile including subscriptions, bookings count, and coach assignment.
 */
export default defineEventHandler(async (event) => {
  const admin = requireAuth(event)
  requireAdmin(admin)

  const id = getRouterParam(event, 'id')!

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      loginAttempts: true,
      lockedUntil: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptionPlan: { select: { id: true, name: true, planType: true, validityDays: true, price: true } },
        },
      },
      bookings: {
        select: { id: true, status: true },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, amount: true, status: true, createdAt: true, transactionId: true },
      },
    },
  })

  if (!user) throw createError({ statusCode: 404, message: 'Utilisateur introuvable.' })

  // Coach assignment (if CLIENT)
  const assignment = user.role === 'CLIENT'
    ? await prisma.coachClientAssignment.findFirst({
        where: { clientId: id, status: 'ACCEPTED' },
        include: { coach: { select: { id: true, name: true, email: true } } },
      })
    : null

  // Stats
  const bookingsByStatus = user.bookings.reduce<Record<string, number>>(
    (acc: Record<string, number>, b: { id: string; status: string }) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1
      return acc
    },
    {}
  )

  const activeSubscription = user.subscriptions.find(
    (s: { status: string; expiresAt: Date | null }) =>
      s.status === 'ACTIVE' && (!s.expiresAt || s.expiresAt > new Date())
  ) ?? null

  const totalPaid = user.payments
    .filter((p: { status: string; amount: number }) => p.status === 'COMPLETED')
    .reduce((sum: number, p: { status: string; amount: number }) => sum + p.amount, 0)

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lockedUntil: user.lockedUntil,
    },
    activeSubscription,
    subscriptions: user.subscriptions,
    payments: user.payments,
    assignment,
    stats: {
      totalBookings: user.bookings.length,
      bookingsByStatus,
      totalPaid,
    },
  }
})
