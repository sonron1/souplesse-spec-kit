import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock h3 ─────────────────────────────────────────────────────────────────
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
  it('allows requests under the limit', () => {
    const handler = rateLimitMiddleware({ max: 3, windowMs: 60_000 })
    const event = {}

    expect(() => handler(event as any)).not.toThrow()
    expect(() => handler(event as any)).not.toThrow()
    expect(() => handler(event as any)).not.toThrow()
  })

  it('throws 429 when limit is exceeded', () => {
    const handler = rateLimitMiddleware({ max: 2, windowMs: 60_000, keyPrefix: 'test-rl' })
    const event = {}

    handler(event as any) // 1
    handler(event as any) // 2
    expect(() => handler(event as any)).toThrowError() // 3 → 429
    const err = (() => {
      try { handler(event as any) }
      catch (e: any) { return e }
    })()
    expect(err.statusCode).toBe(429)
    expect(err.data).toHaveProperty('retryAfter')
  })

  it('resets counter after the window expires', async () => {
    const handler = rateLimitMiddleware({ max: 1, windowMs: 50, keyPrefix: 'test-window' })
    const event = {}

    handler(event as any) // 1
    expect(() => handler(event as any)).toThrowError() // over limit

    // wait for window to expire
    await new Promise((r) => setTimeout(r, 60))
    expect(() => handler(event as any)).not.toThrow() // reset, allowed again
  })

  it('tracks IPs separately', () => {
    const handler = rateLimitMiddleware({ max: 1, windowMs: 60_000, keyPrefix: 'test-ip' })

    mockGetRequestIP.mockReturnValue('192.168.1.1')
    expect(() => handler({} as any)).not.toThrow()
    expect(() => handler({} as any)).toThrowError()

    // Different IP — fresh bucket
    mockGetRequestIP.mockReturnValue('10.0.0.1')
    expect(() => handler({} as any)).not.toThrow()
  })

  it('uses "unknown" key when IP cannot be determined', () => {
    mockGetRequestIP.mockReturnValue(undefined)
    const handler = rateLimitMiddleware({ max: 1, windowMs: 60_000, keyPrefix: 'test-unknown' })
    expect(() => handler({} as any)).not.toThrow()
  })
})

// ─── default export (global rate limiter — 200 req/min) ───────────────────────
describe('default export — global rate limiter', () => {
  it('allows first request for a new IP', () => {
    mockGetRequestIP.mockReturnValue('200.201.202.1')
    expect(() => (defaultRateLimiter as any)({})).not.toThrow()
  })

  it('throws 429 when the 200-req/min global limit is exceeded', () => {
    mockGetRequestIP.mockReturnValue('200.201.202.2')
    for (let i = 0; i < 200; i++) (defaultRateLimiter as any)({})
    let err: any
    try { (defaultRateLimiter as any)({}) } catch (e) { err = e }
    expect(err?.statusCode).toBe(429)
  })

  it('resets global counter when the rate-limit window expires', () => {
    vi.useFakeTimers()
    mockGetRequestIP.mockReturnValue('200.201.202.3')
    for (let i = 0; i < 200; i++) (defaultRateLimiter as any)({})
    expect(() => (defaultRateLimiter as any)({})).toThrowError()
    vi.advanceTimersByTime(61_000)
    expect(() => (defaultRateLimiter as any)({})).not.toThrow()
    vi.useRealTimers()
  })

  it('uses "unknown" key for global handler when IP cannot be determined', () => {
    mockGetRequestIP.mockReturnValue(undefined)
    expect(() => (defaultRateLimiter as any)({})).not.toThrow()
  })
})
