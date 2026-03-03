import { describe, it, expect, vi, beforeEach } from 'vitest'
import { statsService } from '../../server/services/stats.service'

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    user: { count: vi.fn() },
    subscription: { count: vi.fn() },
    payment: { aggregate: vi.fn(), findMany: vi.fn() },
    booking: { count: vi.fn() },
    session: { count: vi.fn() },
  },
}))

import { prisma } from '../../server/utils/prisma'
const mockPrisma = vi.mocked(prisma) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('statsService.getDashboardStats', () => {
  it('returns aggregated dashboard stats', async () => {
    mockPrisma.user.count.mockResolvedValue(150)
    mockPrisma.subscription.count.mockResolvedValue(80)
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 750000 } } as never)
    mockPrisma.booking.count.mockResolvedValue(320)
    mockPrisma.session.count.mockResolvedValue(40)
    mockPrisma.payment.findMany.mockResolvedValue([
      { amount: 5000, createdAt: new Date('2026-03-15') },
      { amount: 5000, createdAt: new Date('2026-03-20') },
    ] as never)

    const stats = await statsService.getDashboardStats()

    expect(stats.totalUsers).toBe(150)
    expect(stats.activeSubscriptions).toBe(80)
    expect(stats.totalRevenue).toBe(750000)
    expect(stats.totalBookings).toBe(320)
    expect(stats.totalSessions).toBe(40)
    expect(stats.revenueByMonth).toEqual([{ month: '2026-03', total: 10000 }])
  })

  it('handles zero revenue gracefully', async () => {
    mockPrisma.user.count.mockResolvedValue(0)
    mockPrisma.subscription.count.mockResolvedValue(0)
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } } as never)
    mockPrisma.booking.count.mockResolvedValue(0)
    mockPrisma.session.count.mockResolvedValue(0)
    mockPrisma.payment.findMany.mockResolvedValue([])

    const stats = await statsService.getDashboardStats()
    expect(stats.totalRevenue).toBe(0)
    expect(stats.revenueByMonth).toEqual([])
  })
})
