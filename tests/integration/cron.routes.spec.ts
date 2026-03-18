/**
 * Integration tests for cron route handlers.
 *
 * POST /api/cron/expire-subscriptions
 *   – expires normal + paused-overtime subscriptions
 *   – returns { skipped: true } when lock is already held
 *   – returns 401 when CRON_SECRET is wrong
 *
 * POST /api/cron/send-reminders
 *   – sends notifications + emails for subs expiring in 3 days
 *   – returns { skipped: true } when lock is already held
 *   – returns 401 when CRON_SECRET is wrong
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auth / rate-limit mocks ───────────────────────────────────────────────────
const mockRequireAuth = vi.fn()
vi.mock('../../server/middleware/auth.middleware', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))
vi.mock('../../server/middleware/rateLimit.middleware', () => ({
  rateLimitMiddleware: () => () => Promise.resolve(),
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger:  { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ── Cron lock mock ────────────────────────────────────────────────────────────
const mockAcquire = vi.fn()
const mockRelease = vi.fn().mockResolvedValue(undefined)
vi.mock('../../server/utils/cronLock', () => ({
  acquireCronLock: (...args: any[]) => mockAcquire(...args),
  releaseCronLock: (...args: any[]) => mockRelease(...args),
}))

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockUpdateMany = vi.fn()
const mockFindMany   = vi.fn()
const mockFindFirst  = vi.fn()
const mockCreate     = vi.fn()
const mockSubUpdate  = vi.fn()

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    subscription: {
      updateMany: (...a: any[]) => mockUpdateMany(...a),
      findMany:   (...a: any[]) => mockFindMany(...a),
      update:     (...a: any[]) => mockSubUpdate(...a),
    },
    user:    { findFirst: (...a: any[]) => mockFindFirst(...a) },
    message: { create:    (...a: any[]) => mockCreate(...a) },
  },
}))

// ── Notification service mock ─────────────────────────────────────────────────
const mockNotifCreate = vi.fn().mockResolvedValue({})
vi.mock('../../server/services/notification.service', () => ({
  notificationService: { create: (...a: any[]) => mockNotifCreate(...a) },
}))

// ── Email mock ────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/email', () => ({
  sendSubscriptionReminderEmail: vi.fn().mockResolvedValue(undefined),
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    getRequestHeader: (event: any, name: string) => event._headers?.[name],
    createError: (opts: { statusCode: number; message: string }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      return e
    },
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────
function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

const MOCK_SUB = {
  id: 'sub-1',
  user: { id: 'user-1', email: 'user@test.com', firstName: 'Alice' },
  subscriptionPlan: { name: 'Abonnement 1 mois' },
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'secret123'
  mockAcquire.mockResolvedValue(true)   // lock acquired by default
  mockRelease.mockResolvedValue(undefined)
  mockUpdateMany.mockResolvedValue({ count: 0 })
})

// ─── expire-subscriptions ─────────────────────────────────────────────────────
describe('POST /api/cron/expire-subscriptions', () => {
  it('expires subscriptions and releases lock', async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 3 })  // normalExpired
      .mockResolvedValueOnce({ count: 1 })  // pauseExpired

    const handler = (await import('../../server/api/cron/expire-subscriptions.post')).default as any
    const result = await handler(makeEvent({
      _headers: { authorization: 'Bearer secret123' },
    }))

    expect(result.success).toBe(true)
    expect(result.expired).toBe(4)
    expect(result.normalExpired).toBe(3)
    expect(result.pauseExpired).toBe(1)
    expect(result.skipped).toBeUndefined()
    expect(mockAcquire).toHaveBeenCalledWith('cron:expire-subscriptions', expect.any(Number))
    expect(mockRelease).toHaveBeenCalledWith('cron:expire-subscriptions')
  })

  it('returns { skipped: true } when lock is already held', async () => {
    mockAcquire.mockResolvedValue(false) // lock not acquired

    const handler = (await import('../../server/api/cron/expire-subscriptions.post')).default as any
    const result = await handler(makeEvent({
      _headers: { authorization: 'Bearer secret123' },
    }))

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('concurrent_lock')
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockRelease).not.toHaveBeenCalled()
  })

  it('throws 401 when CRON_SECRET is wrong', async () => {
    const handler = (await import('../../server/api/cron/expire-subscriptions.post')).default as any
    await expect(
      handler(makeEvent({ _headers: { authorization: 'Bearer wrong' } }))
    ).rejects.toMatchObject({ statusCode: 401 })
    expect(mockAcquire).not.toHaveBeenCalled()
  })

  it('throws 401 when authorization header is missing', async () => {
    const handler = (await import('../../server/api/cron/expire-subscriptions.post')).default as any
    await expect(
      handler(makeEvent({ _headers: {} }))
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('releases lock even when updateMany throws', async () => {
    mockUpdateMany.mockRejectedValue(new Error('DB error'))

    const handler = (await import('../../server/api/cron/expire-subscriptions.post')).default as any
    await expect(
      handler(makeEvent({ _headers: { authorization: 'Bearer secret123' } }))
    ).rejects.toThrow('DB error')

    // Lock must be released in the finally block
    expect(mockRelease).toHaveBeenCalledWith('cron:expire-subscriptions')
  })
})

// ─── send-reminders ───────────────────────────────────────────────────────────
describe('POST /api/cron/send-reminders', () => {
  it('sends reminders and marks subs as reminded', async () => {
    mockFindMany.mockResolvedValue([MOCK_SUB])
    mockFindFirst.mockResolvedValue({ id: 'admin-1' })
    mockCreate.mockResolvedValue({})
    mockSubUpdate.mockResolvedValue({})

    const handler = (await import('../../server/api/cron/send-reminders.post')).default as any
    const result = await handler(makeEvent({
      _headers: { authorization: 'Bearer secret123' },
    }))

    expect(result.success).toBe(true)
    expect(result.sent).toBe(1)
    expect(mockNotifCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledOnce() // message.create
    expect(mockSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: expect.objectContaining({ reminderSentAt: expect.any(Date) }) })
    )
    expect(mockRelease).toHaveBeenCalledWith('cron:send-reminders')
  })

  it('returns { skipped: true } when lock is already held', async () => {
    mockAcquire.mockResolvedValue(false)

    const handler = (await import('../../server/api/cron/send-reminders.post')).default as any
    const result = await handler(makeEvent({
      _headers: { authorization: 'Bearer secret123' },
    }))

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(mockRelease).not.toHaveBeenCalled()
  })

  it('throws 401 when CRON_SECRET is wrong', async () => {
    const handler = (await import('../../server/api/cron/send-reminders.post')).default as any
    await expect(
      handler(makeEvent({ _headers: { authorization: 'Bearer bad' } }))
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('sends 0 reminders when no subscriptions are expiring', async () => {
    mockFindMany.mockResolvedValue([])
    mockFindFirst.mockResolvedValue(null)

    const handler = (await import('../../server/api/cron/send-reminders.post')).default as any
    const result = await handler(makeEvent({
      _headers: { authorization: 'Bearer secret123' },
    }))

    expect(result.sent).toBe(0)
    expect(mockNotifCreate).not.toHaveBeenCalled()
  })

  it('releases lock even when findMany throws', async () => {
    mockFindMany.mockRejectedValue(new Error('DB timeout'))

    const handler = (await import('../../server/api/cron/send-reminders.post')).default as any
    await expect(
      handler(makeEvent({ _headers: { authorization: 'Bearer secret123' } }))
    ).rejects.toThrow('DB timeout')

    expect(mockRelease).toHaveBeenCalledWith('cron:send-reminders')
  })

  it('skips internal message when no admin user exists', async () => {
    mockFindMany.mockResolvedValue([MOCK_SUB])
    mockFindFirst.mockResolvedValue(null) // no admin
    mockSubUpdate.mockResolvedValue({})

    const handler = (await import('../../server/api/cron/send-reminders.post')).default as any
    const result = await handler(makeEvent({
      _headers: { authorization: 'Bearer secret123' },
    }))

    expect(result.sent).toBe(1)
    expect(mockCreate).not.toHaveBeenCalled() // no message.create — no admin
  })
})
