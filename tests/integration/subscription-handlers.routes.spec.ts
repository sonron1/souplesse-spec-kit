/**
 * Integration tests for subscription API route handlers.
 * POST /api/subscriptions/:id/pause   — pause an active subscription
 * POST /api/subscriptions/:id/resume  — resume a paused subscription
 * GET  /api/subscriptions             — list user subscriptions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auth/role mocks ───────────────────────────────────────────────────────────
const mockRequireAuth = vi.fn()
const mockRequireRole = vi.fn()

vi.mock('../../server/middleware/auth.middleware', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))
vi.mock('../../server/utils/role', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ── Subscription service mock ─────────────────────────────────────────────────
const mockPause = vi.fn()
const mockResume = vi.fn()
vi.mock('../../server/services/subscription.service', () => ({
  subscriptionService: {
    pauseSubscription: (...args: any[]) => mockPause(...args),
    resumeSubscription: (...args: any[]) => mockResume(...args),
  },
}))

// ── Prisma mock (for list route) ──────────────────────────────────────────────
const mockSubFindMany = vi.fn()
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    subscription: { findMany: (...args: any[]) => mockSubFindMany(...args) },
  },
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    getRouterParam: (event: any, name: string) => event._params?.[name],
    createError: (opts: { statusCode: number; message: string; data?: any }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      if (opts.data) e.data = opts.data
      return e
    },
  }
})

const CLIENT_USER = { sub: 'u-1', email: 'client@test.com', role: 'CLIENT', type: 'access' }

const MOCK_SUB = {
  id: 'sub-1',
  userId: 'u-1',
  status: 'ACTIVE',
  isActive: true,
  pausedAt: null,
  pauseCount: 0,
}

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue(CLIENT_USER)
  mockRequireRole.mockReturnValue(undefined)
})

// ─── GET /api/subscriptions ───────────────────────────────────────────────────
describe('GET /api/subscriptions', () => {
  it('returns user subscriptions', async () => {
    mockSubFindMany.mockResolvedValue([MOCK_SUB])

    const handler = (await import('../../server/api/subscriptions/index.get')).default as any
    const result = await handler(makeEvent())

    expect(Array.isArray(result)).toBe(true)
    expect(result[0].id).toBe('sub-1')
  })

  it('throws 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue({ statusCode: 401 })

    const handler = (await import('../../server/api/subscriptions/index.get')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ─── POST /api/subscriptions/:id/pause ───────────────────────────────────────
describe('POST /api/subscriptions/:id/pause', () => {
  it('pauses an active subscription and returns success', async () => {
    const paused = { ...MOCK_SUB, pausedAt: new Date(), pauseCount: 1 }
    mockPause.mockResolvedValue(paused)

    const handler = (await import('../../server/api/subscriptions/[id]/pause.post')).default as any
    const result = await handler(makeEvent({ _params: { id: 'sub-1' } }))

    expect(result.success).toBe(true)
    expect(result.subscription.pausedAt).toBeTruthy()
    expect(mockPause).toHaveBeenCalledWith('sub-1', 'u-1')
  })

  it('throws 400 when subscription is already paused', async () => {
    mockPause.mockRejectedValue({ statusCode: 400, message: 'Déjà en pause' })

    const handler = (await import('../../server/api/subscriptions/[id]/pause.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'sub-1' } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when max pauses exceeded', async () => {
    mockPause.mockRejectedValue({ statusCode: 400, message: 'Nombre de pauses maximum atteint (2)' })

    const handler = (await import('../../server/api/subscriptions/[id]/pause.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'sub-1' } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 403 when non-client tries to pause', async () => {
    mockRequireRole.mockImplementation(() => { throw { statusCode: 403 } })

    const handler = (await import('../../server/api/subscriptions/[id]/pause.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'sub-1' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 when subscription not found', async () => {
    mockPause.mockRejectedValue({ statusCode: 404 })

    const handler = (await import('../../server/api/subscriptions/[id]/pause.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'bad-id' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ─── POST /api/subscriptions/:id/resume ──────────────────────────────────────
describe('POST /api/subscriptions/:id/resume', () => {
  it('resumes a paused subscription and returns success', async () => {
    const resumed = { ...MOCK_SUB, status: 'ACTIVE', pausedAt: null }
    mockResume.mockResolvedValue(resumed)

    const handler = (await import('../../server/api/subscriptions/[id]/resume.post')).default as any
    const result = await handler(makeEvent({ _params: { id: 'sub-1' } }))

    expect(result.success).toBe(true)
    expect(result.subscription.pausedAt).toBeNull()
    expect(mockResume).toHaveBeenCalledWith('sub-1', 'u-1')
  })

  it('throws 400 when subscription is not paused', async () => {
    mockResume.mockRejectedValue({ statusCode: 400, message: 'Pas en pause' })

    const handler = (await import('../../server/api/subscriptions/[id]/resume.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'sub-1' } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when subscription not found', async () => {
    mockResume.mockRejectedValue({ statusCode: 404 })

    const handler = (await import('../../server/api/subscriptions/[id]/resume.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'bad-id' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when not owner of subscription', async () => {
    mockResume.mockRejectedValue({ statusCode: 403 })

    const handler = (await import('../../server/api/subscriptions/[id]/resume.post')).default as any
    await expect(
      handler(makeEvent({ _params: { id: 'sub-1' } }))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
