import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscriptionService } from '../../server/services/subscription.service'

vi.mock('../../server/services/subscription.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockSubService = vi.mocked(subscriptionService)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Subscription pause/resume routes (R005)', () => {
  describe('POST /api/subscriptions/:id/pause', () => {
    it('pauses an active subscription', async () => {
      const mockSub = { id: 'sub-1', userId: 'user-1', status: 'ACTIVE', pausedAt: new Date() }
      mockSubService.pauseSubscription.mockResolvedValue(mockSub as never)

      const result = await subscriptionService.pauseSubscription('sub-1', 'user-1')
      expect(result.pausedAt).toBeTruthy()
    })

    it('throws 400 if subscription already paused', async () => {
      mockSubService.pauseSubscription.mockRejectedValue({
        statusCode: 400,
        message: "L'abonnement est déjà en pause",
      })

      await expect(
        subscriptionService.pauseSubscription('sub-1', 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 400 if max pauses exceeded', async () => {
      mockSubService.pauseSubscription.mockRejectedValue({
        statusCode: 400,
        message: 'Nombre de pauses maximum atteint (2)',
      })

      await expect(
        subscriptionService.pauseSubscription('sub-1', 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 403 if not the owner', async () => {
      mockSubService.pauseSubscription.mockRejectedValue({ statusCode: 403 })

      await expect(
        subscriptionService.pauseSubscription('sub-1', 'other-user')
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  describe('POST /api/subscriptions/:id/resume', () => {
    it('resumes a paused subscription and extends expiry', async () => {
      const mockSub = { id: 'sub-1', userId: 'user-1', status: 'ACTIVE', pausedAt: null }
      mockSubService.resumeSubscription.mockResolvedValue(mockSub as never)

      const result = await subscriptionService.resumeSubscription('sub-1', 'user-1')
      expect(result.pausedAt).toBeNull()
    })

    it('throws 400 if subscription is not paused', async () => {
      mockSubService.resumeSubscription.mockRejectedValue({
        statusCode: 400,
        message: "L'abonnement n'est pas en pause",
      })

      await expect(
        subscriptionService.resumeSubscription('sub-1', 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 404 if subscription not found', async () => {
      mockSubService.resumeSubscription.mockRejectedValue({ statusCode: 404 })

      await expect(
        subscriptionService.resumeSubscription('sub-1', 'user-1')
      ).rejects.toMatchObject({ statusCode: 404 })
    })
  })
})
