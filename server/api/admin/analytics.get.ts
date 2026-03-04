import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'
import { prisma } from '../../utils/prisma'

/**
 * GET /api/admin/analytics
 * Admin-only: extended analytics for the comptability/inventory view.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    totalClients,
    totalCoaches,
    activeSubscriptions,
    expiredSubscriptions,
    pendingSubscriptions,
    totalSessions,
    upcomingSessions,
    confirmedBookings,
    totalRevenue,
    revenueThisMonth,
    newClientsThisMonth,
    recentPayments,
    planBreakdown,
    topClients,
    subscriptionsByMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'COACH' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    prisma.subscription.count({ where: { status: 'PENDING' } }),
    prisma.session.count(),
    prisma.session.count({ where: { dateTime: { gte: now } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.payment.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: 'CONFIRMED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: startOfMonth } } }),
    // Monthly revenue last 6 months
    prisma.payment.findMany({
      where: { status: 'CONFIRMED', createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true },
    }),
    // Subscriptions by plan
    prisma.subscription.groupBy({
      by: ['subscriptionPlanId'],
      _count: { _all: true },
      where: { status: 'ACTIVE' },
    }),
    // Top 5 clients by total payments
    prisma.payment.groupBy({
      by: ['userId'],
      where: { status: 'CONFIRMED' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    // Subscriptions created per month (last 6 months)
    prisma.subscription.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
    }),
  ])

  // Build monthly revenue map
  const revenueByMonth: Record<string, number> = {}
  for (const p of recentPayments) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + p.amount
  }

  // Build monthly subscriptions map
  const subscriptionsByMonthMap: Record<string, number> = {}
  for (const s of subscriptionsByMonth) {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`
    subscriptionsByMonthMap[key] = (subscriptionsByMonthMap[key] ?? 0) + 1
  }

  // Resolve plan names for planBreakdown
  const planIds = planBreakdown.map(p => p.subscriptionPlanId).filter(Boolean) as string[]
  const plans = planIds.length
    ? await prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true, planType: true } })
    : []
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]))

  const planStats = planBreakdown.map(p => ({
    planId: p.subscriptionPlanId,
    planName: planMap[p.subscriptionPlanId ?? '']?.name ?? 'Inconnu',
    planType: planMap[p.subscriptionPlanId ?? '']?.planType ?? '',
    count: p._count._all,
  }))

  // Resolve user names for topClients
  const topUserIds = topClients.map(t => t.userId)
  const topUsers = topUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: topUserIds } }, select: { id: true, name: true, email: true } })
    : []
  const userMap = Object.fromEntries(topUsers.map(u => [u.id, u]))

  const topClientStats = topClients.map(t => ({
    userId: t.userId,
    name: userMap[t.userId]?.name ?? '—',
    email: userMap[t.userId]?.email ?? '—',
    totalPaid: t._sum.amount ?? 0,
  }))

  // Build sorted arrays
  const allMonths = new Set([...Object.keys(revenueByMonth), ...Object.keys(subscriptionsByMonthMap)])
  const monthlyData = Array.from(allMonths).sort().map(month => ({
    month,
    revenue: revenueByMonth[month] ?? 0,
    subscriptions: subscriptionsByMonthMap[month] ?? 0,
  }))

  return {
    success: true,
    kpis: {
      totalClients,
      totalCoaches,
      activeSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
      totalSessions,
      upcomingSessions,
      confirmedBookings,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
      newClientsThisMonth,
    },
    planStats,
    topClients: topClientStats,
    monthlyData,
  }
})
