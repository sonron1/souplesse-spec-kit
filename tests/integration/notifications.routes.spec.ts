/**
 * Integration tests for notification API routes.
 * GET   /api/notifications        — list notifications for current user
 * PATCH /api/notifications/:id    — mark a notification read (or all)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auth mocks ────────────────────────────────────────────────────────────────
const mockRequireAuth = vi.fn()
vi.mock('../../server/middleware/auth.middleware', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../server/middleware/rateLimit.middleware', () => ({
  rateLimitMiddleware: () => () => Promise.resolve(),
}))

// ── Notification service mock ─────────────────────────────────────────────────
const mockNotifService = {
  getForUser: vi.fn(),
  countUnread: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}
vi.mock('../../server/services/notification.service', () => ({
  notificationService: mockNotifService,
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    getQuery: (event: any) => event._query ?? {},
    getRouterParam: (event: any, name: string) => event._params?.[name],
    createError: (opts: { statusCode: number; message: string }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      return e
    },
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────
const CLIENT_USER = { sub: 'client-1', email: 'client@test.com', role: 'CLIENT', type: 'access' }

const MOCK_NOTIF = {
  id: 'notif-1',
  userId: 'client-1',
  type: 'SUBSCRIPTION_EXPIRING',
  title: 'Abonnement bientôt expiré',
  body: 'Votre abonnement expire dans 3 jours.',
  read: false,
  createdAt: new Date(),
}

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/notifications ───────────────────────────────────────────────────
describe('GET /api/notifications', () => {
  it('returns notifications and unread count', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockNotifService.getForUser.mockResolvedValue([MOCK_NOTIF])
    mockNotifService.countUnread.mockResolvedValue(1)

    const handler = (await import('../../server/api/notifications/index.get')).default as any
    const result = await handler(makeEvent({ _query: {} }))

    expect(result.notifications).toHaveLength(1)
    expect(result.unreadCount).toBe(1)
    expect(mockNotifService.getForUser).toHaveBeenCalledWith('client-1', 20, false)
  })

  it('filters unread-only when ?unread=true', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockNotifService.getForUser.mockResolvedValue([MOCK_NOTIF])
    mockNotifService.countUnread.mockResolvedValue(1)

    const handler = (await import('../../server/api/notifications/index.get')).default as any
    await handler(makeEvent({ _query: { unread: 'true', limit: '10' } }))

    expect(mockNotifService.getForUser).toHaveBeenCalledWith('client-1', 10, true)
  })

  it('caps limit at 50', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockNotifService.getForUser.mockResolvedValue([])
    mockNotifService.countUnread.mockResolvedValue(0)

    const handler = (await import('../../server/api/notifications/index.get')).default as any
    await handler(makeEvent({ _query: { limit: '999' } }))

    expect(mockNotifService.getForUser).toHaveBeenCalledWith('client-1', 50, false)
  })
})

// ─── PATCH /api/notifications/:id ────────────────────────────────────────────
describe('PATCH /api/notifications/:id', () => {
  it('marks a specific notification as read', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockNotifService.markRead.mockResolvedValue({ ...MOCK_NOTIF, read: true })

    const handler = (await import('../../server/api/notifications/[id].patch')).default as any
    // handler reads event.context.params?.id directly (not getRouterParam)
    const result = await handler(makeEvent({ context: { params: { id: 'notif-1' } } }))

    expect(result.ok).toBe(true)
    expect(mockNotifService.markRead).toHaveBeenCalledWith('notif-1', 'client-1')
  })

  it('marks all notifications as read when id is "all"', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockNotifService.markAllRead.mockResolvedValue(5)

    const handler = (await import('../../server/api/notifications/[id].patch')).default as any
    const result = await handler(makeEvent({ context: { params: { id: 'all' } } }))

    expect(result.ok).toBe(true)
    expect(result.count).toBe(5)
    expect(mockNotifService.markAllRead).toHaveBeenCalledWith('client-1')
  })

  it('throws 404 if notification not found', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockNotifService.markRead.mockResolvedValue(null)

    const handler = (await import('../../server/api/notifications/[id].patch')).default as any
    await expect(
      handler(makeEvent({ context: { params: { id: 'missing' } } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 400 if no id provided', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)

    const handler = (await import('../../server/api/notifications/[id].patch')).default as any
    await expect(
      handler(makeEvent({ context: { params: {} } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
