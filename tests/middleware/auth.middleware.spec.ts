/**
 * Unit tests for server/middleware/auth.middleware.ts
 * Covers the defineEventHandler (token extraction + verification) and requireAuth helper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock h3 ───────────────────────────────────────────────────────────────────
const mockGetHeader = vi.fn()
vi.mock('h3', () => ({
  defineEventHandler: (fn: (e: any) => any) => fn,
  getHeader: (...args: any[]) => mockGetHeader(...args),
  createError: (opts: { statusCode: number; message: string; data?: any }) => {
    const e = new Error(opts.message) as any
    e.statusCode = opts.statusCode
    if (opts.data) e.data = opts.data
    return e
  },
}))

// ── Mock jwt utils ────────────────────────────────────────────────────────────
const mockVerifyJwt = vi.fn()
vi.mock('../../server/utils/jwt', () => ({
  verifyJwt: (...args: any[]) => mockVerifyJwt(...args),
}))

// ── Mock userRepository ───────────────────────────────────────────────────────
const mockFindById = vi.fn()
vi.mock('../../server/repositories/user.repository', () => ({
  userRepository: { findById: (...args: any[]) => mockFindById(...args) },
}))

// ── Mock logger ───────────────────────────────────────────────────────────────
vi.mock('../../server/utils/logger', () => ({
  default: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import logger from '../../server/utils/logger'
const mockLogger = vi.mocked(logger)

function makeEvent(authHeader?: string, contextUser?: any) {
  return {
    node: { req: { method: 'GET' } },
    context: { user: contextUser },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── defineEventHandler (default export) ─────────────────────────────────────
describe('auth middleware handler', () => {
  it('does nothing when Authorization header is absent', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    mockGetHeader.mockReturnValue(undefined)
    const event = makeEvent()
    await handler(event)
    expect(event.context.user).toBeUndefined()
  })

  it('does nothing when Authorization header does not start with Bearer', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    mockGetHeader.mockReturnValue('Basic dXNlcjpwYXNz')
    const event = makeEvent()
    await handler(event)
    expect(event.context.user).toBeUndefined()
  })

  it('attaches decoded user to event.context when token is valid', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    const payload = { sub: 'u-1', email: 'a@b.com', role: 'CLIENT', type: 'access' }
    mockGetHeader.mockReturnValue('Bearer valid.token.here')
    mockVerifyJwt.mockReturnValue(payload)
    const event = makeEvent()
    await handler(event)
    expect(event.context.user).toEqual(payload)
  })

  it('logs debug and does not throw on jwt malformed token', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    mockGetHeader.mockReturnValue('Bearer bad.token')
    mockVerifyJwt.mockImplementation(() => { throw new Error('jwt malformed') })
    const event = makeEvent()
    await expect(handler(event)).resolves.not.toThrow()
    expect(mockLogger.debug).toHaveBeenCalled()
    expect(event.context.user).toBeUndefined()
  })

  it('logs debug and does not throw on jwt expired token', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    mockGetHeader.mockReturnValue('Bearer expired.token')
    mockVerifyJwt.mockImplementation(() => { throw new Error('jwt expired') })
    const event = makeEvent()
    await expect(handler(event)).resolves.not.toThrow()
    expect(mockLogger.debug).toHaveBeenCalled()
  })

  it('logs warn (not debug) for other JWT errors', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    mockGetHeader.mockReturnValue('Bearer some.token')
    mockVerifyJwt.mockImplementation(() => { throw new Error('invalid signature') })
    const event = makeEvent()
    await expect(handler(event)).resolves.not.toThrow()
    expect(mockLogger.warn).toHaveBeenCalled()
    expect(mockLogger.debug).not.toHaveBeenCalled()
  })

  it('handles non-Error thrown by verifyJwt (logs warn, empty message)', async () => {
    const handler = (await import('../../server/middleware/auth.middleware')).default as any
    mockGetHeader.mockReturnValue('Bearer some.token')
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    mockVerifyJwt.mockImplementation(() => { throw 'raw-string-error' })
    const event = makeEvent()
    await expect(handler(event)).resolves.not.toThrow()
    expect(mockLogger.warn).toHaveBeenCalled()
  })
})

// ─── requireAuth helper ───────────────────────────────────────────────────────
describe('requireAuth', () => {
  it('throws 401 when no user in context', async () => {
    const { requireAuth } = await import('../../server/middleware/auth.middleware')
    const event = makeEvent(undefined, undefined)
    await expect(requireAuth(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns payload when user exists and has no sessionToken', async () => {
    const { requireAuth } = await import('../../server/middleware/auth.middleware')
    const payload = { sub: 'u-1', email: 'a@b.com', role: 'CLIENT', type: 'access' }
    const event = makeEvent(undefined, payload)
    const result = await requireAuth(event)
    expect(result).toEqual(payload)
    expect(mockFindById).not.toHaveBeenCalled()
  })

  it('returns payload when sessionToken matches DB', async () => {
    const { requireAuth } = await import('../../server/middleware/auth.middleware')
    const payload = { sub: 'u-1', email: 'a@b.com', role: 'CLIENT', type: 'access', sessionToken: 'tok-1' }
    mockFindById.mockResolvedValue({ id: 'u-1', sessionToken: 'tok-1' })
    const event = makeEvent(undefined, payload)
    const result = await requireAuth(event)
    expect(result.sub).toBe('u-1')
  })

  it('throws 401 with session_revoked when sessionToken does not match DB', async () => {
    const { requireAuth } = await import('../../server/middleware/auth.middleware')
    const payload = { sub: 'u-1', email: 'a@b.com', role: 'CLIENT', type: 'access', sessionToken: 'old-tok' }
    mockFindById.mockResolvedValue({ id: 'u-1', sessionToken: 'new-tok' }) // different
    const event = makeEvent(undefined, payload)
    await expect(requireAuth(event)).rejects.toMatchObject({
      statusCode: 401,
      data: { code: 'session_revoked' },
    })
  })

  it('throws 401 when DB user not found (sessionToken present)', async () => {
    const { requireAuth } = await import('../../server/middleware/auth.middleware')
    const payload = { sub: 'u-ghost', email: 'ghost@b.com', role: 'CLIENT', type: 'access', sessionToken: 'tok' }
    mockFindById.mockResolvedValue(null) // user deleted
    const event = makeEvent(undefined, payload)
    await expect(requireAuth(event)).rejects.toMatchObject({ statusCode: 401 })
  })
})
