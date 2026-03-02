import { prisma } from '../utils/prisma'

export interface DashboardStats {
  totalUsers: number
  totalCoaches: number
  totalClients: number
  activeSubscriptions: number
  totalRevenue: number
  totalBookings: number
  totalSessions: number
  upcomingSessions: number
  revenueByMonth: { month: string; total: number }[]
}

export const statsService = {
  /**
   * Compute dashboard aggregates.
   * Uses Prisma aggregation queries to avoid N+1.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date()
    const [
      totalUsers,
      totalCoaches,
      totalClients,
      activeSubscriptions,
      revenueAgg,
      totalBookings,
      totalSessions,
      upcomingSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'COACH' } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.session.count(),
      prisma.session.count({ where: { dateTime: { gte: now } } }),
    ])

    const totalRevenue = revenueAgg._sum.amount ?? 0

    // Monthly revenue for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentPayments = await prisma.payment.findMany({
      where: { status: 'CONFIRMED', createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true },
    })

    const byMonth: Record<string, number> = {}
    for (const p of recentPayments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = (byMonth[key] ?? 0) + p.amount
    }

    const revenueByMonth = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }))

    return {
      totalUsers,
      totalCoaches,
      totalClients,
      activeSubscriptions,
      totalRevenue,
      totalBookings,
      totalSessions,
      upcomingSessions,
      revenueByMonth,
    }
  },
}
