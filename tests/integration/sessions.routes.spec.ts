/**
 * Integration tests for session API routes.
 * GET  /api/sessions           — list with pagination
 * POST /api/sessions           — create (coach only)
 * DELETE /api/sessions/:id     — delete (coach/admin)
 * PATCH /api/sessions/:id      — update (coach/admin)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared auth/role mocks ────────────────────────────────────────────────────
const mockRequireAuth = vi.fn()
const mockRequireCoach = vi.fn()
const mockRequireRole = vi.fn()

vi.mock('../../server/middleware/auth.middleware', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))
vi.mock('../../server/utils/role', () => ({
  requireCoach: (...args: any[]) => mockRequireCoach(...args),
  requireRole: (...args: any[]) => mockRequireRole(...args),
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ── Session repository mock ───────────────────────────────────────────────────
const mockSessRepo = {
  findAll: vi.fn(),
  countAll: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}
vi.mock('../../server/repositories/session.repository', () => ({
  sessionRepository: mockSessRepo,
}))

// ── Prisma mock (for booking.updateMany in delete route) ──────────────────────
const mockBookingUpdateMany = vi.fn()
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    booking: { updateMany: (...args: any[]) => mockBookingUpdateMany(...args) },
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

// ── Validators mock ───────────────────────────────────────────────────────────
const mockValidateBody = vi.fn()
const mockValidateQuery = vi.fn()
vi.mock('../../server/validators/index', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    validateBody: (...args: any[]) => mockValidateBody(...args),
    validateQuery: (...args: any[]) => mockValidateQuery(...args),
  }
})

const COACH_USER = { sub: 'coach-1', email: 'coach@test.com', role: 'COACH', type: 'access' }
const ADMIN_USER = { sub: 'admin-1', email: 'admin@test.com', role: 'ADMIN', type: 'access' }

const MOCK_SESSION = {
  id: 'sess-1',
  coachId: 'coach-1',
  dateTime: new Date('2026-04-01T09:00:00Z'),
  duration: 60,
  capacity: 10,
}

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireCoach.mockReturnValue(undefined)
  mockRequireRole.mockReturnValue(undefined)
})

// ─── GET /api/sessions ────────────────────────────────────────────────────────
describe('GET /api/sessions', () => {
  it('returns sessions with pagination', async () => {
    mockValidateQuery.mockReturnValue({ page: 1, limit: 20, order: 'asc' })
    mockSessRepo.findAll.mockResolvedValue([MOCK_SESSION])
    mockSessRepo.countAll.mockResolvedValue(1)

    const handler = (await import('../../server/api/sessions/index.get')).default as any
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.sessions).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it('applies date filters when from/to are provided', async () => {
    mockValidateQuery.mockReturnValue({ page: 1, limit: 20, from: '2026-04-01', to: '2026-04-30', order: 'asc' })
    mockSessRepo.findAll.mockResolvedValue([MOCK_SESSION])
    mockSessRepo.countAll.mockResolvedValue(1)

    const handler = (await import('../../server/api/sessions/index.get')).default as any
    await handler(makeEvent())

    expect(mockSessRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) })
    )
    // to date should be end-of-day T23:59:59.999Z
    const callArgs = mockSessRepo.findAll.mock.calls[0][0]
    expect(callArgs.to.toISOString()).toContain('T23:59:59.999Z')
  })
})

// ─── POST /api/sessions ───────────────────────────────────────────────────────
describe('POST /api/sessions', () => {
  it('creates a session as a coach', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockValidateBody.mockResolvedValue({ dateTime: '2026-04-01T09:00:00Z', duration: 60, capacity: 10 })
    mockSessRepo.create.mockResolvedValue(MOCK_SESSION)

    const handler = (await import('../../server/api/sessions/index.post')).default as any
    const result = await handler(makeEvent())

    expect(result.success).toBe(true)
    expect(result.session.coachId).toBe('coach-1')
    expect(mockSessRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ coachId: 'coach-1', duration: 60, capacity: 10 })
    )
  })

  it('throws 403 if not a coach', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockRequireCoach.mockImplementation(() => { throw { statusCode: 403 } })

    const handler = (await import('../../server/api/sessions/index.post')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

// ─── DELETE /api/sessions/:id ─────────────────────────────────────────────────
describe('DELETE /api/sessions/:id', () => {
  it('deletes own session as coach and cancels bookings', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockSessRepo.findById.mockResolvedValue(MOCK_SESSION)
    mockBookingUpdateMany.mockResolvedValue({ count: 2 })
    mockSessRepo.delete.mockResolvedValue(MOCK_SESSION)

    const handler = (await import('../../server/api/sessions/[id].delete')).default as any
    const result = await handler(makeEvent({ _params: { id: 'sess-1' } }))

    expect(result.success).toBe(true)
    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } })
    )
    expect(mockSessRepo.delete).toHaveBeenCalledWith('sess-1')
  })

  it('throws 404 when session not found', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockSessRepo.findById.mockResolvedValue(null)

    const handler = (await import('../../server/api/sessions/[id].delete')).default as any
    await expect(handler(makeEvent({ _params: { id: 'bad-id' } }))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when coach tries to delete another coach session', async () => {
    mockRequireAuth.mockResolvedValue({ ...COACH_USER, sub: 'other-coach' })
    mockSessRepo.findById.mockResolvedValue(MOCK_SESSION) // coachId = 'coach-1'

    const handler = (await import('../../server/api/sessions/[id].delete')).default as any
    await expect(handler(makeEvent({ _params: { id: 'sess-1' } }))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows admin to delete any session', async () => {
    mockRequireAuth.mockResolvedValue(ADMIN_USER)
    mockSessRepo.findById.mockResolvedValue(MOCK_SESSION)
    mockBookingUpdateMany.mockResolvedValue({ count: 0 })
    mockSessRepo.delete.mockResolvedValue(MOCK_SESSION)

    const handler = (await import('../../server/api/sessions/[id].delete')).default as any
    const result = await handler(makeEvent({ _params: { id: 'sess-1' } }))

    expect(result.success).toBe(true)
  })
})

// ─── PATCH /api/sessions/:id ──────────────────────────────────────────────────
describe('PATCH /api/sessions/:id', () => {
  it('updates own session as coach', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockSessRepo.findById.mockResolvedValue(MOCK_SESSION)
    const updated = { ...MOCK_SESSION, capacity: 15 }
    mockValidateBody.mockResolvedValue({ capacity: 15 })
    mockSessRepo.update.mockResolvedValue(updated)

    const handler = (await import('../../server/api/sessions/[id].patch')).default as any
    const result = await handler(makeEvent({ _params: { id: 'sess-1' } }))

    expect(result.success).toBe(true)
    expect(result.session.capacity).toBe(15)
  })

  it('throws 404 when session not found', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockSessRepo.findById.mockResolvedValue(null)

    const handler = (await import('../../server/api/sessions/[id].patch')).default as any
    await expect(handler(makeEvent({ _params: { id: 'bad-id' } }))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when coach tries to update another coach session', async () => {
    mockRequireAuth.mockResolvedValue({ ...COACH_USER, sub: 'other-coach' })
    mockSessRepo.findById.mockResolvedValue(MOCK_SESSION)

    const handler = (await import('../../server/api/sessions/[id].patch')).default as any
    await expect(handler(makeEvent({ _params: { id: 'sess-1' } }))).rejects.toMatchObject({ statusCode: 403 })
  })
})
