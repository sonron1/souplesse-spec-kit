/**
 * Integration tests for email-verification routes.
 *
 * POST /api/auth/resend-verification
 *   – always returns 200 + success message (prevents user enumeration)
 *   – calls authService.resendVerification with lowercased email
 *   – returns 422 when body is invalid (not a valid email)
 *   – propagates unexpected service errors
 *
 * GET /api/auth/verify-email?token=<hex>
 *   – returns { success: true, email } on valid token
 *   – returns { success: false } when token query param is absent
 *   – propagates 404 when token is invalid / already consumed
 *   – propagates 410 when token is expired
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auth service mock ─────────────────────────────────────────────────────────
const mockResendVerification = vi.fn()
const mockVerifyEmail = vi.fn()
vi.mock('../../server/services/auth.service', () => ({
  authService: {
    resendVerification: (...args: any[]) => mockResendVerification(...args),
    verifyEmail: (...args: any[]) => mockVerifyEmail(...args),
  },
}))

// ── Rate-limit middleware mock ────────────────────────────────────────────────
vi.mock('../../server/middleware/rateLimit.middleware', () => ({
  rateLimitMiddleware: () => () => Promise.resolve(),
}))

// ── Logger mock ───────────────────────────────────────────────────────────────
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ── Validators mock ───────────────────────────────────────────────────────────
const mockValidateBody = vi.fn()
vi.mock('../../server/validators/index', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    validateBody: (...args: any[]) => mockValidateBody(...args),
  }
})

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    getQuery: (event: any) => event._query ?? {},
    createError: (opts: { statusCode: number; message: string }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      return e
    },
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── POST /api/auth/resend-verification ───────────────────────────────────────
describe('POST /api/auth/resend-verification', () => {
  it('returns 200 + success message for a known unverified email', async () => {
    mockValidateBody.mockResolvedValue({ email: 'alice@example.com' })
    mockResendVerification.mockResolvedValue(undefined)

    const handler = (await import('../../server/api/auth/resend-verification.post')).default as any
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.message).toMatch(/lien/)
    expect(mockResendVerification).toHaveBeenCalledWith('alice@example.com')
  })

  it('returns 200 + success message even for an unknown email (prevents enumeration)', async () => {
    // Service silently ignores unknown emails (returns void)
    mockValidateBody.mockResolvedValue({ email: 'unknown@example.com' })
    mockResendVerification.mockResolvedValue(undefined)

    const handler = (await import('../../server/api/auth/resend-verification.post')).default as any
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    // Service still called — enumeration-proof at HTTP level means always 200
    expect(mockResendVerification).toHaveBeenCalledOnce()
  })

  it('returns 200 + success message even for an already-verified email', async () => {
    // Service silently ignores already-verified accounts
    mockValidateBody.mockResolvedValue({ email: 'verified@example.com' })
    mockResendVerification.mockResolvedValue(undefined)

    const handler = (await import('../../server/api/auth/resend-verification.post')).default as any
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
  })

  it('propagates 422 when validateBody throws (invalid email format)', async () => {
    const err = new Error('Validation failed') as any
    err.statusCode = 422
    mockValidateBody.mockRejectedValue(err)

    const handler = (await import('../../server/api/auth/resend-verification.post')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 })
    expect(mockResendVerification).not.toHaveBeenCalled()
  })

  it('propagates unexpected service errors (e.g. DB failure)', async () => {
    mockValidateBody.mockResolvedValue({ email: 'alice@example.com' })
    const dbErr = new Error('Connection refused') as any
    dbErr.statusCode = 500
    mockResendVerification.mockRejectedValue(dbErr)

    const handler = (await import('../../server/api/auth/resend-verification.post')).default as any
    await expect(handler(makeEvent())).rejects.toThrow('Connection refused')
  })
})

// ─── GET /api/auth/verify-email ───────────────────────────────────────────────
describe('GET /api/auth/verify-email', () => {
  it('returns { success: true, email } on a valid token', async () => {
    mockVerifyEmail.mockResolvedValue({ email: 'alice@example.com' })

    const handler = (await import('../../server/api/auth/verify-email.get')).default as any
    const result = await handler(makeEvent({ _query: { token: 'abc123deadbeef' } }))

    expect(result.success).toBe(true)
    expect(result.email).toBe('alice@example.com')
    expect(result.message).toMatch(/vérifi/i)
    expect(mockVerifyEmail).toHaveBeenCalledWith('abc123deadbeef')
  })

  it('returns { success: false } when token query param is absent', async () => {
    const handler = (await import('../../server/api/auth/verify-email.get')).default as any
    const result = await handler(makeEvent({ _query: {} }))

    expect(result.success).toBe(false)
    expect(mockVerifyEmail).not.toHaveBeenCalled()
  })

  it('returns { success: false } when token is an empty string', async () => {
    const handler = (await import('../../server/api/auth/verify-email.get')).default as any
    // Empty string is falsy → guard triggers
    const result = await handler(makeEvent({ _query: { token: '' } }))

    expect(result.success).toBe(false)
    expect(mockVerifyEmail).not.toHaveBeenCalled()
  })

  it('propagates 404 when token is invalid or already consumed', async () => {
    const err = new Error('Token de vérification invalide ou déjà utilisé.') as any
    err.statusCode = 404
    mockVerifyEmail.mockRejectedValue(err)

    const handler = (await import('../../server/api/auth/verify-email.get')).default as any
    await expect(
      handler(makeEvent({ _query: { token: 'bad-token' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('propagates 410 when token has expired (TTL exceeded)', async () => {
    const err = new Error('Ce lien de vérification a expiré.') as any
    err.statusCode = 410
    mockVerifyEmail.mockRejectedValue(err)

    const handler = (await import('../../server/api/auth/verify-email.get')).default as any
    await expect(
      handler(makeEvent({ _query: { token: 'expired-token' } }))
    ).rejects.toMatchObject({ statusCode: 410 })
  })
})
