/**
 * Integration tests for booking API routes.
 * GET    /api/bookings           — list user bookings (flat + paginated)
 * POST   /api/bookings           — create booking (CLIENT only)
 * DELETE /api/bookings/:id       — cancel booking (CLIENT only)
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

// ── Prisma mock (for bookings.get route) ──────────────────────────────────────
const mockBookingFindMany = vi.fn()
const mockBookingCount = vi.fn()
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    booking: {
      findMany: (...args: any[]) => mockBookingFindMany(...args),
      count: (...args: any[]) => mockBookingCount(...args),
    },
  },
}))

// ── Booking service mock ──────────────────────────────────────────────────────
const mockBookSession = vi.fn()
vi.mock('../../server/services/booking.service', () => ({
  bookingService: { bookSession: (...args: any[]) => mockBookSession(...args) },
}))

// ── Booking repository mock ───────────────────────────────────────────────────
const mockFindById = vi.fn()
const mockCancel = vi.fn()
vi.mock('../../server/repositories/booking.repository', () => ({
  bookingRepository: {
    findById: (...args: any[]) => mockFindById(...args),
    cancel: (...args: any[]) => mockCancel(...args),
  },
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
    getRouterParam: (event: any, name: string) => event._params?.[name],
    getQuery: (event: any) => event._query ?? {},
    createError: (opts: { statusCode: number; message: string; data?: any }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      if (opts.data) e.data = opts.data
      return e
    },
  }
})

const CLIENT_USER = { sub: 'u-1', email: 'client@test.com', role: 'CLIENT', type: 'access' }

const MOCK_BOOKING = {
  id: 'bk-1',
  userId: 'u-1',
  sessionId: 'sess-1',
  status: 'CONFIRMED' as const,
  session: { id: 'sess-1', dateTime: new Date('2026-04-01T09:00:00Z'), duration: 60 },
}

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue(CLIENT_USER)
  mockRequireRole.mockReturnValue(undefined)
})

// ─── GET /api/bookings ────────────────────────────────────────────────────────
describe('GET /api/bookings', () => {
  it('returns flat array when no pagination params provided', async () => {
    mockBookingFindMany.mockResolvedValue([MOCK_BOOKING])

    const handler = (await import('../../server/api/bookings/index.get')).default as any
    const result = await handler(makeEvent({ _query: {} }))

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('bk-1')
  })

  it('returns paginated response when page+limit params are provided', async () => {
    mockBookingFindMany.mockResolvedValue([MOCK_BOOKING])
    mockBookingCount.mockResolvedValue(5)

    const handler = (await import('../../server/api/bookings/index.get')).default as any
    const result = await handler(makeEvent({ _query: { page: '1', limit: '10' } }))

    expect(result.bookings).toHaveLength(1)
    expect(result.pagination.total).toBe(5)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('throws 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue({ statusCode: 401 })

    const handler = (await import('../../server/api/bookings/index.get')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ─── POST /api/bookings ───────────────────────────────────────────────────────
describe('POST /api/bookings', () => {
  it('creates a booking for a client', async () => {
    mockValidateBody.mockResolvedValue({ sessionId: 'sess-1' })
    mockBookSession.mockResolvedValue(MOCK_BOOKING)

    const handler = (await import('../../server/api/bookings/index.post')).default as any
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.booking.id).toBe('bk-1')
    expect(mockBookSession).toHaveBeenCalledWith('u-1', 'sess-1')
  })

  it('throws 402 when client has no active subscription', async () => {
    mockValidateBody.mockResolvedValue({ sessionId: 'sess-1' })
    mockBookSession.mockRejectedValue({ statusCode: 402, data: { code: 'subscription_required' } })

    const handler = (await import('../../server/api/bookings/index.post')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 402,
      data: { code: 'subscription_required' },
    })
  })

  it('throws 409 when session is full', async () => {
    mockValidateBody.mockResolvedValue({ sessionId: 'sess-full' })
    mockBookSession.mockRejectedValue({ statusCode: 409, message: 'Cette séance est complète' })

    const handler = (await import('../../server/api/bookings/index.post')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 403 when non-client tries to book', async () => {
    mockRequireRole.mockImplementation(() => { throw { statusCode: 403 } })

    const handler = (await import('../../server/api/bookings/index.post')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
describe('DELETE /api/bookings/:id', () => {
  it('cancels own booking', async () => {
    mockFindById.mockResolvedValue(MOCK_BOOKING)
    mockCancel.mockResolvedValue(undefined)

    const handler = (await import('../../server/api/bookings/[id].delete')).default as any
    const result = await handler(makeEvent({ _params: { id: 'bk-1' } }))

    expect(result.success).toBe(true)
    expect(mockCancel).toHaveBeenCalledWith('bk-1')
  })

  it('throws 404 when booking not found', async () => {
    mockFindById.mockResolvedValue(null)

    const handler = (await import('../../server/api/bookings/[id].delete')).default as any
    await expect(handler(makeEvent({ _params: { id: 'bad' } }))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when trying to cancel another user booking', async () => {
    mockFindById.mockResolvedValue({ ...MOCK_BOOKING, userId: 'other-user' })

    const handler = (await import('../../server/api/bookings/[id].delete')).default as any
    await expect(handler(makeEvent({ _params: { id: 'bk-1' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 400 when booking is already cancelled', async () => {
    mockFindById.mockResolvedValue({ ...MOCK_BOOKING, status: 'CANCELLED' as const })

    const handler = (await import('../../server/api/bookings/[id].delete')).default as any
    await expect(handler(makeEvent({ _params: { id: 'bk-1' } }))).rejects.toMatchObject({ statusCode: 400 })
  })
})
