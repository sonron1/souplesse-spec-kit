import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationService } from '../../server/services/notification.service'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'

const mockPrisma = vi.mocked(prisma)

const MOCK_NOTIF = {
  id: 'n-1',
  userId: 'u-1',
  type: 'COACH_ASSIGNED',
  title: 'Coach assigné',
  body: 'Votre coach est disponible.',
  readAt: null as Date | null,
  createdAt: new Date('2026-03-01T10:00:00Z'),
}

beforeEach(() => { vi.clearAllMocks() })

// ─── create() ────────────────────────────────────────────────────────────────
describe('notificationService.create', () => {
  it('creates and returns a notification', async () => {
    mockPrisma.notification.create.mockResolvedValue(MOCK_NOTIF as never)

    const result = await notificationService.create({
      userId: 'u-1',
      type: 'COACH_ASSIGNED',
      title: 'Coach assigné',
      body: 'Votre coach est disponible.',
    })

    expect(mockPrisma.notification.create).toHaveBeenCalledOnce()
    expect(result.id).toBe('n-1')
    expect(result.type).toBe('COACH_ASSIGNED')
  })
})

// ─── getForUser() ─────────────────────────────────────────────────────────────
describe('notificationService.getForUser', () => {
  it('returns all notifications for a user, newest first', async () => {
    const list = [MOCK_NOTIF, { ...MOCK_NOTIF, id: 'n-2' }]
    mockPrisma.notification.findMany.mockResolvedValue(list as never)

    const result = await notificationService.getForUser('u-1')

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u-1' }),
        orderBy: { createdAt: 'desc' },
      })
    )
    expect(result).toHaveLength(2)
  })

  it('filters unread when unreadOnly=true', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([] as never)

    await notificationService.getForUser('u-1', 20, true)

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ readAt: null }),
      })
    )
  })
})

// ─── countUnread() ────────────────────────────────────────────────────────────
describe('notificationService.countUnread', () => {
  it('returns the count of unread notifications', async () => {
    mockPrisma.notification.count.mockResolvedValue(3 as never)

    const count = await notificationService.countUnread('u-1')

    expect(count).toBe(3)
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'u-1', readAt: null },
    })
  })
})

// ─── markRead() ───────────────────────────────────────────────────────────────
describe('notificationService.markRead', () => {
  it('marks an unread notification as read and returns it', async () => {
    const updatedNotif = { ...MOCK_NOTIF, readAt: new Date() }
    mockPrisma.notification.findUnique.mockResolvedValue(MOCK_NOTIF as never)
    mockPrisma.notification.update.mockResolvedValue(updatedNotif as never)

    const result = await notificationService.markRead('n-1', 'u-1')
    expect(result!.readAt).not.toBeNull()
    expect(mockPrisma.notification.update).toHaveBeenCalledOnce()
  })

  it('returns null when notification belongs to a different user', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({ ...MOCK_NOTIF, userId: 'other' } as never)

    const result = await notificationService.markRead('n-1', 'u-1')
    expect(result).toBeNull()
    expect(mockPrisma.notification.update).not.toHaveBeenCalled()
  })

  it('returns notification without update if already read', async () => {
    const alreadyRead = { ...MOCK_NOTIF, readAt: new Date() }
    mockPrisma.notification.findUnique.mockResolvedValue(alreadyRead as never)

    const result = await notificationService.markRead('n-1', 'u-1')
    expect(result!.readAt).not.toBeNull()
    expect(mockPrisma.notification.update).not.toHaveBeenCalled()
  })
})

// ─── markAllRead() ────────────────────────────────────────────────────────────
describe('notificationService.markAllRead', () => {
  it('marks all unread notifications for a user as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 } as never)

    await notificationService.markAllRead('u-1')

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u-1', readAt: null }),
      })
    )
  })
})
