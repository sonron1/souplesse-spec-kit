/**
 * Integration tests for profile routes (GET/PATCH /api/auth/me)
 * and user lookup (GET /api/users/lookup).
 * Tests import route handlers directly and mount mock middleware / service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared mocks ──────────────────────────────────────────────────────────────
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

// ── Mock authService ──────────────────────────────────────────────────────────
const mockGetProfile = vi.fn()
const mockUpdateProfile = vi.fn()
vi.mock('../../server/services/auth.service', () => ({
  authService: {
    getProfile: (...args: any[]) => mockGetProfile(...args),
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  },
}))

// ── Mock validators ───────────────────────────────────────────────────────────
const mockValidateBody = vi.fn()
vi.mock('../../server/validators', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/validators')>()
  return {
    ...actual,
    validateBody: (...args: any[]) => mockValidateBody(...args),
  }
})

// ── Mock prisma for lookup route ──────────────────────────────────────────────
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
  },
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    getQuery: (event: any) => event._query ?? {},
    getRouterParam: (event: any, name: string) => event._params?.[name],
    // Stub getRequestIP so rate-limited handlers don't crash on missing event.node.req
    getRequestIP: () => '127.0.0.1',
    createError: (opts: { statusCode: number; message: string; statusMessage?: string; data?: any }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      e.statusMessage = opts.statusMessage
      if (opts.data) e.data = opts.data
      return e
    },
  }
})

const CLIENT_USER = { sub: 'u-1', email: 'client@test.com', role: 'CLIENT', type: 'access' }

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: { user: CLIENT_USER }, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue(CLIENT_USER)
  mockRequireRole.mockReturnValue(undefined) // passes silently
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns the user profile', async () => {
    const profile = { id: 'u-1', email: 'client@test.com', firstName: 'Alice', role: 'CLIENT' }
    mockGetProfile.mockResolvedValue(profile)

    const handler = (await import('../../server/api/auth/me.get')).default as any
    const result = await handler(makeEvent())

    expect(result).toEqual(profile)
    expect(mockGetProfile).toHaveBeenCalledWith('u-1')
  })

  it('throws 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue({ statusCode: 401, message: 'Non authentifié' })

    const handler = (await import('../../server/api/auth/me.get')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────
describe('PATCH /api/auth/me', () => {
  it('updates and returns the user profile', async () => {
    const body = { firstName: 'Bob', lastName: 'Smith' }
    const updated = { id: 'u-1', firstName: 'Bob', lastName: 'Smith', email: 'client@test.com' }
    mockValidateBody.mockResolvedValue(body)
    mockUpdateProfile.mockResolvedValue(updated)

    const handler = (await import('../../server/api/auth/me.patch')).default as any
    const result = await handler(makeEvent())

    expect(result).toEqual(updated)
    expect(mockUpdateProfile).toHaveBeenCalledWith('u-1', body)
  })

  it('propagates 409 phone_taken from updateProfile', async () => {
    mockValidateBody.mockResolvedValue({ phone: '+22900000099' })
    mockUpdateProfile.mockRejectedValue({ statusCode: 409, data: { code: 'phone_taken' } })

    const handler = (await import('../../server/api/auth/me.patch')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'phone_taken' },
    })
  })

  it('propagates 404 when user not found', async () => {
    mockValidateBody.mockResolvedValue({ firstName: 'Nobody' })
    mockUpdateProfile.mockRejectedValue({ statusCode: 404, message: 'not_found' })

    const handler = (await import('../../server/api/auth/me.patch')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ─── GET /api/users/lookup ────────────────────────────────────────────────────
describe('GET /api/users/lookup', () => {
  const OTHER_CLIENT = {
    id: 'u-2',
    firstName: 'Carol',
    lastName: 'Dupont',
    email: 'carol@test.com',
    phone: '+22900000002',
    gender: 'FEMALE',
    role: 'CLIENT',
  }

  it('finds a client user by email', async () => {
    mockFindUnique.mockResolvedValue(OTHER_CLIENT)

    const handler = (await import('../../server/api/users/lookup.get')).default as any
    const result = await handler(makeEvent({ _query: { email: 'carol@test.com' } }))

    expect(result.found).toBe(true)
    expect(result.gender).toBe('FEMALE')
    expect(result.email).toBe('carol@test.com')
  })

  it('finds a client user by phone', async () => {
    mockFindUnique.mockResolvedValue(OTHER_CLIENT)

    const handler = (await import('../../server/api/users/lookup.get')).default as any
    const result = await handler(makeEvent({ _query: { phone: '+22900000002' } }))

    expect(result.found).toBe(true)
    expect(result.name).toBe('Carol Dupont')
  })

  it('finds a client user by firstName + lastName', async () => {
    mockFindFirst.mockResolvedValue(OTHER_CLIENT)

    const handler = (await import('../../server/api/users/lookup.get')).default as any
    const result = await handler(makeEvent({ _query: { firstName: 'Carol', lastName: 'Dupont' } }))

    expect(result.found).toBe(true)
  })

  it('throws 404 when user not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    const handler = (await import('../../server/api/users/lookup.get')).default as any
    await expect(
      handler(makeEvent({ _query: { email: 'nobody@test.com' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 404 when found user is not CLIENT role', async () => {
    mockFindUnique.mockResolvedValue({ ...OTHER_CLIENT, role: 'COACH' })

    const handler = (await import('../../server/api/users/lookup.get')).default as any
    await expect(
      handler(makeEvent({ _query: { email: 'carol@test.com' } }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 400 when user tries to look up themselves', async () => {
    mockFindUnique.mockResolvedValue({ ...OTHER_CLIENT, email: 'client@test.com', role: 'CLIENT' })

    const handler = (await import('../../server/api/users/lookup.get')).default as any
    await expect(
      handler(makeEvent({ _query: { email: 'client@test.com' } }))
    ).rejects.toMatchObject({ statusCode: 400, statusMessage: 'self_partner' })
  })

  it('throws 400 when no query parameter is provided', async () => {
    const handler = (await import('../../server/api/users/lookup.get')).default as any
    await expect(
      handler(makeEvent({ _query: {} }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when firstName/lastName are both empty strings', async () => {
    const handler = (await import('../../server/api/users/lookup.get')).default as any
    await expect(
      handler(makeEvent({ _query: { firstName: '  ', lastName: '  ' } }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
