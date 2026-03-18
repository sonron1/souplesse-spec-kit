/**
 * Integration tests for coach-related CLIENT routes.
 * GET   /api/coaches              — list all coaches (CLIENT/COACH/ADMIN)
 * POST  /api/me/coach-request     — CLIENT requests a specific coach
 * GET   /api/me/assignment        — CLIENT gets their current assignment
 * PATCH /api/me/assignment        — CLIENT accepts or refuses a pending assignment
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auth mocks ────────────────────────────────────────────────────────────────
const mockRequireAuth = vi.fn()
vi.mock('../../server/middleware/auth.middleware', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../server/middleware/rateLimit.middleware', () => ({
  rateLimitMiddleware: () => () => Promise.resolve(),
}))
vi.mock('../../server/utils/systemLog', () => ({
  systemLog: vi.fn(),
}))

// ── Service mocks ─────────────────────────────────────────────────────────────
const mockNotifService = { create: vi.fn().mockResolvedValue({}) }
vi.mock('../../server/services/notification.service', () => ({
  notificationService: mockNotifService,
}))
const mockMsgService = { sendDirectMessage: vi.fn().mockResolvedValue({}) }
vi.mock('../../server/services/message.service', () => ({
  messageService: mockMsgService,
}))

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockUserFindMany  = vi.fn()
const mockUserFindUnique = vi.fn()
const mockAssignFindFirst = vi.fn()
const mockAssignFindFirst2 = vi.fn() // separate for different call contexts
const mockAssignUpsert   = vi.fn()
const mockAssignUpdate   = vi.fn()

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    user: {
      findMany:  (...a: any[]) => mockUserFindMany(...a),
      findUnique: (...a: any[]) => mockUserFindUnique(...a),
    },
    coachClientAssignment: {
      findFirst: (...a: any[]) => mockAssignFindFirst(...a),
      upsert:    (...a: any[]) => mockAssignUpsert(...a),
      update:    (...a: any[]) => mockAssignUpdate(...a),
    },
  },
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    readBody: (event: any) => Promise.resolve(event._readBody ?? {}),
    createError: (opts: { statusCode: number; message: string }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      return e
    },
  }
})

// ── Users ─────────────────────────────────────────────────────────────────────
const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const COACH_ID  = '00000000-0000-0000-0000-000000000002'
const ADMIN_ID  = '00000000-0000-0000-0000-000000000003'

const CLIENT_USER = { sub: CLIENT_ID, email: 'client@test.com', role: 'CLIENT', type: 'access' }
const COACH_USER  = { sub: COACH_ID,  email: 'coach@test.com',  role: 'COACH',  type: 'access' }

const MOCK_COACH = { id: COACH_ID, name: 'Jean Coach', email: 'coach@test.com', avatarUrl: null }

const MOCK_ASSIGNMENT = {
  id: '00000000-0000-0000-0000-000000000010',
  coachId: COACH_ID,
  clientId: CLIENT_ID,
  status: 'PENDING',
  requestedBy: 'admin',
  respondedAt: null,
  coach: { id: COACH_ID, name: 'Jean Coach' },
  client: { id: CLIENT_ID, name: 'Marie Client' },
}

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/coaches ─────────────────────────────────────────────────────────
describe('GET /api/coaches', () => {
  it('returns list of coaches for authenticated user', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockUserFindMany.mockResolvedValue([MOCK_COACH])

    const handler = (await import('../../server/api/coaches/index.get')).default as any
    const result = await handler(makeEvent())

    expect(result.coaches).toHaveLength(1)
    expect(result.coaches[0].name).toBe('Jean Coach')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'COACH' } })
    )
  })

  it('throws 401 if not authenticated', async () => {
    mockRequireAuth.mockRejectedValue({ statusCode: 401 })

    const handler = (await import('../../server/api/coaches/index.get')).default as any
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ─── POST /api/me/coach-request ───────────────────────────────────────────────
describe('POST /api/me/coach-request', () => {
  it('creates a coach request for an authenticated CLIENT', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'coach-1', role: 'COACH', name: 'Jean Coach' }) // coach lookup
      .mockResolvedValueOnce({ name: 'Marie Client' })                             // me_user lookup
    mockAssignFindFirst.mockResolvedValue(null)                                    // no existing assignment
    mockAssignUpsert.mockResolvedValue({ ...MOCK_ASSIGNMENT, status: 'PENDING' })
    mockUserFindMany.mockResolvedValue([{ id: 'admin-1' }])                        // admins

    const handler = (await import('../../server/api/me/coach-request.post')).default as any
    const result = await handler({ ...makeEvent(), _readBody: { coachId: COACH_ID } })

    expect(result.ok).toBe(true)
    expect(result.assignment).toBeDefined()
  })

  it('throws 403 if user is not CLIENT', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)

    const handler = (await import('../../server/api/me/coach-request.post')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { coachId: COACH_ID } })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 409 if client already has an active assignment', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockUserFindUnique.mockResolvedValue({ id: 'coach-1', role: 'COACH', name: 'Jean Coach' })
    mockAssignFindFirst.mockResolvedValue({
      ...MOCK_ASSIGNMENT,
      status: 'ACCEPTED',
      coach: { name: 'Jean Coach' },
    })

    const handler = (await import('../../server/api/me/coach-request.post')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { coachId: COACH_ID } })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 404 if coachId does not exist', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockUserFindUnique.mockResolvedValue(null)
    mockAssignFindFirst.mockResolvedValue(null)

    const handler = (await import('../../server/api/me/coach-request.post')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { coachId: '00000000-0000-0000-ffff-000000000000' } })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ─── GET /api/me/assignment ───────────────────────────────────────────────────
describe('GET /api/me/assignment', () => {
  it('returns the current assignment for a CLIENT', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockAssignFindFirst.mockResolvedValue({
      ...MOCK_ASSIGNMENT,
      coach: { id: 'coach-1', name: 'Jean Coach', email: 'coach@test.com', avatarUrl: null },
    })

    const handler = (await import('../../server/api/me/assignment.get')).default as any
    const result = await handler(makeEvent())

    expect(result.assignment).toBeDefined()
    expect(result.assignment.coachId).toBe(COACH_ID)
  })

  it('returns null assignment if no assignment exists', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockAssignFindFirst.mockResolvedValue(null)

    const handler = (await import('../../server/api/me/assignment.get')).default as any
    const result = await handler(makeEvent())

    expect(result.assignment).toBeNull()
  })
})

// ─── PATCH /api/me/assignment ─────────────────────────────────────────────────
describe('PATCH /api/me/assignment', () => {
  it('allows CLIENT to ACCEPT a pending assignment', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockAssignFindFirst.mockResolvedValue(MOCK_ASSIGNMENT)
    mockAssignUpdate.mockResolvedValue({ ...MOCK_ASSIGNMENT, status: 'ACCEPTED' })
    mockUserFindMany.mockResolvedValue([{ id: 'admin-1' }]) // admins

    const handler = (await import('../../server/api/me/assignment.patch')).default as any
    const result = await handler({ ...makeEvent(), _readBody: { action: 'ACCEPT' } })

    expect(result.ok).toBe(true)
    expect(result.status).toBe('ACCEPTED')
    expect(mockAssignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    )
  })

  it('allows CLIENT to REFUSE a pending assignment', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockAssignFindFirst.mockResolvedValue(MOCK_ASSIGNMENT)
    mockAssignUpdate.mockResolvedValue({ ...MOCK_ASSIGNMENT, status: 'REJECTED' })
    mockUserFindMany.mockResolvedValue([])

    const handler = (await import('../../server/api/me/assignment.patch')).default as any
    const result = await handler({ ...makeEvent(), _readBody: { action: 'REFUSE' } })

    expect(result.ok).toBe(true)
    expect(result.status).toBe('REJECTED')
  })

  it('throws 403 if user is not a CLIENT', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)

    const handler = (await import('../../server/api/me/assignment.patch')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { action: 'ACCEPT' } })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 if no pending assignment found', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockAssignFindFirst.mockResolvedValue(null)

    const handler = (await import('../../server/api/me/assignment.patch')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { action: 'ACCEPT' } })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 400 if action is invalid', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)

    const handler = (await import('../../server/api/me/assignment.patch')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { action: 'MAYBE' } })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
