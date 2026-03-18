/**
 * Integration tests for GET /api/admin/health
 *
 * - Returns db, redis, crons, subscriptions when admin is authenticated
 * - Redis status: 'ok' when env vars set + ping succeeds
 * - Redis status: 'unconfigured' when env vars absent
 * - Redis status: 'error' when ping fails
 * - DB status: 'error' when $queryRaw throws
 * - Cron history pulled from SystemLog (last 10 entries per action)
 * - Throws 403 when caller is not ADMIN
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Admin middleware mock ─────────────────────────────────────────────────────
const mockRequireAdmin = vi.fn()
vi.mock('../../server/middleware/admin.middleware', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
  default: () => {},
}))

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockQueryRaw  = vi.fn()
const mockSubCount  = vi.fn()
const mockLogFindMany = vi.fn()

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    $queryRaw:    (...a: any[]) => mockQueryRaw(...a),
    subscription: { count: (...a: any[]) => mockSubCount(...a) },
    systemLog:    { findMany: (...a: any[]) => mockLogFindMany(...a) },
  },
}))

// ── @upstash/redis mock ───────────────────────────────────────────────────────
const mockPing = vi.fn()
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({ ping: mockPing })),
}))

// ── Logger mock ───────────────────────────────────────────────────────────────
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    createError: (opts: { statusCode: number; message: string }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      return e
    },
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeEvent() { return { context: {} } }

const MOCK_ADMIN = { sub: 'admin-1', role: 'ADMIN' }

const MOCK_LOG = {
  createdAt: new Date('2026-03-18T10:00:00Z'),
  message:   'Expired 3 subscription(s) in 42ms',
  meta:      { expired: 3, normalExpired: 2, pauseExpired: 1, durationMs: 42, ranAt: '2026-03-18T10:00:00.000Z' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue(MOCK_ADMIN)
  // DB: healthy by default
  mockQueryRaw.mockResolvedValue([{ 1: 1 }])
  // Subscriptions counts
  mockSubCount.mockResolvedValue(10)
  // SystemLog: one entry per cron
  mockLogFindMany.mockResolvedValue([MOCK_LOG])
  // Redis env not set by default
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  mockPing.mockResolvedValue('PONG')
})

describe('GET /api/admin/health', () => {
  it('returns db ok + redis unconfigured + cron history by default', async () => {
    const handler = (await import('../../server/api/admin/health.get')).default as any
    const result = await handler(makeEvent())

    expect(result.db.status).toBe('ok')
    expect(result.db.latencyMs).toBeTypeOf('number')

    expect(result.redis.status).toBe('unconfigured')
    expect(result.redis.latencyMs).toBeUndefined()

    expect(result.crons).toHaveLength(2)
    expect(result.crons[0].action).toBe('CRON_EXPIRE_SUBSCRIPTIONS')
    expect(result.crons[0].lastMessage).toBe(MOCK_LOG.message)
    expect(result.crons[0].history).toHaveLength(1)

    expect(result.subscriptions.active).toBe(10)
    expect(result.checkedAt).toBeTypeOf('string')
  })

  it('returns redis ok when env vars set and ping succeeds', async () => {
    process.env.UPSTASH_REDIS_REST_URL   = 'https://redis.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'
    mockPing.mockResolvedValue('PONG')

    const handler = (await import('../../server/api/admin/health.get')).default as any
    const result = await handler(makeEvent())

    expect(result.redis.status).toBe('ok')
    expect(result.redis.latencyMs).toBeTypeOf('number')
    expect(mockPing).toHaveBeenCalledOnce()
  })

  it('returns redis error when ping throws', async () => {
    process.env.UPSTASH_REDIS_REST_URL   = 'https://redis.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'
    mockPing.mockRejectedValue(new Error('Connection timeout'))

    const handler = (await import('../../server/api/admin/health.get')).default as any
    const result = await handler(makeEvent())

    expect(result.redis.status).toBe('error')
    expect(result.redis.error).toContain('Connection timeout')
  })

  it('returns db error when $queryRaw throws', async () => {
    mockQueryRaw.mockRejectedValue(new Error('DB unreachable'))

    const handler = (await import('../../server/api/admin/health.get')).default as any
    const result = await handler(makeEvent())

    expect(result.db.status).toBe('error')
    expect(result.db.error).toContain('DB unreachable')
    expect(result.db.latencyMs).toBeTypeOf('number')
  })

  it('returns null lastRanAt for crons with no log entries', async () => {
    mockLogFindMany.mockResolvedValue([])

    const handler = (await import('../../server/api/admin/health.get')).default as any
    const result = await handler(makeEvent())

    for (const cron of result.crons) {
      expect(cron.lastRanAt).toBeNull()
      expect(cron.lastMeta).toBeNull()
      expect(cron.history).toHaveLength(0)
    }
  })

  it('includes all three subscription counts', async () => {
    mockSubCount
      .mockResolvedValueOnce(42)  // active
      .mockResolvedValueOnce(5)   // expiredToday
      .mockResolvedValueOnce(7)   // expiringIn3d

    const handler = (await import('../../server/api/admin/health.get')).default as any
    const result = await handler(makeEvent())

    expect(result.subscriptions.active).toBe(42)
    expect(result.subscriptions.expiredToday).toBe(5)
    expect(result.subscriptions.expiringIn3d).toBe(7)
  })

  it('propagates 403 when caller is not ADMIN', async () => {
    mockRequireAdmin.mockRejectedValue(Object.assign(new Error('Accès réservé aux administrateurs'), { statusCode: 403 }))

    const handler = (await import('../../server/api/admin/health.get')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})
