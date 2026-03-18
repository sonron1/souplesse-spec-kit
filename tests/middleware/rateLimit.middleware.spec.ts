import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock @upstash/redis ── prevents real network calls; in-memory fallback is
//   used in tests because UPSTASH_REDIS_REST_URL / TOKEN env vars are not set.
vi.mock('@upstash/redis', () => ({
  Redis: class {
    pipeline() {
      const ops: Array<() => void> = []
      const pipe = {
        incr: () => pipe,
        expire: () => pipe,
        exec: async () => [1, 1] as const,
      }
      return pipe
    }
  },
}))

// ── Mock h3 ───────────────────────────────────────────────────────────────────
vi.mock('h3', () => {
  const createError = (opts: { statusCode: number; message: string; data?: unknown }) => {
    const e = new Error(opts.message) as any
    e.statusCode = opts.statusCode
    e.data = opts.data
    return e
  }
  const defineEventHandler = (fn: (e: any) => any) => fn
  const getRequestIP = vi.fn()
  return { createError, defineEventHandler, getRequestIP }
})

import { getRequestIP } from 'h3'
import defaultRateLimiter, { rateLimitMiddleware } from '../../server/middleware/rateLimit.middleware'

const mockGetRequestIP = vi.mocked(getRequestIP)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRequestIP.mockReturnValue('127.0.0.1')
})

// ─── rateLimitMiddleware() factory ────────────────────────────────────────────
describe('rateLimitMiddleware', () => {
  it('allows requests under the limit', async () => {
    const handler = rateLimitMiddleware({ max: 3, windowMs: 60_000, keyPrefix: 'test-under-limit' })
    const event = {}

    await expect(handler(event as any)).resolves.toBeUndefined()
    await expect(handler(event as any)).resolves.toBeUndefined()
    await expect(handler(event as any)).resolves.toBeUndefined()
  })

  it('throws 429 when limit is exceeded', async () => {
    const handler = rateLimitMiddleware({ max: 2, windowMs: 60_000, keyPrefix: 'test-rl-exceeded' })
    const event = {}

    await handler(event as any) // 1
    await handler(event as any) // 2
    await expect(handler(event as any)).rejects.toMatchObject({ statusCode: 429 })

    const err = await handler(event as any).catch((e: any) => e)
    expect(err.statusCode).toBe(429)
    expect(err.data).toHaveProperty('retryAfter')
  })

  it('resets counter after the window expires', async () => {
    const handler = rateLimitMiddleware({ max: 1, windowMs: 50, keyPrefix: 'test-window-reset' })
    const event = {}

    await handler(event as any) // 1 — allowed
    await expect(handler(event as any)).rejects.toMatchObject({ statusCode: 429 }) // 2 — over limit

    // wait for the 50 ms window to expire
    await new Promise((r) => setTimeout(r, 60))
    await expect(handler(event as any)).resolves.toBeUndefined() // reset — allowed again
  })

  it('tracks IPs separately', async () => {
    const handler = rateLimitMiddleware({ max: 1, windowMs: 60_000, keyPrefix: 'test-ip-sep' })

    mockGetRequestIP.mockReturnValue('192.168.10.1')
    await expect(handler({} as any)).resolves.toBeUndefined()
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 429 })

    // Different IP → fresh bucket
    mockGetRequestIP.mockReturnValue('10.0.10.1')
    await expect(handler({} as any)).resolves.toBeUndefined()
  })

  it('uses "unknown" key when IP cannot be determined', async () => {
    mockGetRequestIP.mockReturnValue(undefined)
    const handler = rateLimitMiddleware({ max: 1, windowMs: 60_000, keyPrefix: 'test-unknown-ip' })
    await expect(handler({} as any)).resolves.toBeUndefined()
  })
})

// ─── default export (global rate limiter — 200 req/min) ───────────────────────
describe('default export — global rate limiter', () => {
  it('allows first request for a new IP', async () => {
    mockGetRequestIP.mockReturnValue('200.201.202.1')
    await expect((defaultRateLimiter as any)({})).resolves.toBeUndefined()
  })

  it('throws 429 when the 200-req/min global limit is exceeded', async () => {
    mockGetRequestIP.mockReturnValue('200.201.202.2')
    for (let i = 0; i < 200; i++) await (defaultRateLimiter as any)({})
    await expect((defaultRateLimiter as any)({})).rejects.toMatchObject({ statusCode: 429 })
  })

  it('resets global counter when the rate-limit window expires', async () => {
    vi.useFakeTimers()
    mockGetRequestIP.mockReturnValue('200.201.202.3')
    for (let i = 0; i < 200; i++) await (defaultRateLimiter as any)({})
    await expect((defaultRateLimiter as any)({})).rejects.toMatchObject({ statusCode: 429 })

    vi.advanceTimersByTime(61_000) // advance past the 60-second window
    await expect((defaultRateLimiter as any)({})).resolves.toBeUndefined()
    vi.useRealTimers()
  })

  it('uses "unknown" key for global handler when IP cannot be determined', async () => {
    mockGetRequestIP.mockReturnValue(undefined)
    await expect((defaultRateLimiter as any)({})).resolves.toBeUndefined()
  })
})
