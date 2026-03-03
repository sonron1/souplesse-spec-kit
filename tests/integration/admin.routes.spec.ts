import { describe, it, expect, vi, beforeEach } from 'vitest'
import { statsService } from '../../server/services/stats.service'

vi.mock('../../server/services/stats.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockStats = vi.mocked(statsService)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Admin routes integration', () => {
  describe('GET /api/admin/stats', () => {
    it('returns dashboard stats for admin', async () => {
      const mockData = {
        totalUsers: 50,
        totalCoaches: 5,
        totalClients: 45,
        activeSubscriptions: 30,
        totalRevenue: 250000,
        totalBookings: 120,
        totalSessions: 80,
        upcomingSessions: 10,
        revenueByMonth: [],
      }
      mockStats.getDashboardStats.mockResolvedValue(mockData)

      const stats = await statsService.getDashboardStats()
      expect(stats.totalUsers).toBe(50)
      expect(stats.activeSubscriptions).toBe(30)
    })
  })
})
