/**
 * Integration tests for message API routes.
 * GET  /api/messages          — list conversations (CLIENT / COACH / ADMIN)
 * POST /api/messages          — send a message
 * PATCH /api/messages/:id     — edit a message (15-min window)
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

// ── Service / Prisma mocks ────────────────────────────────────────────────────
const mockMsgService = {
  getConversations: vi.fn(),
  getAdminCoachConversations: vi.fn(),
  countUnread: vi.fn(),
  sendMessage: vi.fn(),
  sendDirectMessage: vi.fn(),
}
vi.mock('../../server/services/message.service', () => ({
  messageService: mockMsgService,
}))

const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockMsgUpdate = vi.fn()
const mockMsgFindUnique = vi.fn()

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: any[]) => mockFindUnique(...a) },
    coachClientAssignment: { findFirst: (...a: any[]) => mockFindFirst(...a) },
    message: {
      findUnique: (...a: any[]) => mockMsgFindUnique(...a),
      update: (...a: any[]) => mockMsgUpdate(...a),
    },
  },
}))

// ── h3 stubs ──────────────────────────────────────────────────────────────────
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (e: any) => any) => fn,
    getRouterParam: (event: any, name: string) => event._params?.[name],
    readBody: (event: any) => Promise.resolve(event._readBody ?? {}),
    createError: (opts: { statusCode: number; message: string }) => {
      const e = new Error(opts.message) as any
      e.statusCode = opts.statusCode
      return e
    },
  }
})

// ── Validators mock ───────────────────────────────────────────────────────────
vi.mock('../../server/validators/index', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return { ...actual }
})

// ── Users ─────────────────────────────────────────────────────────────────────
const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const COACH_ID  = '00000000-0000-0000-0000-000000000002'
const ADMIN_ID  = '00000000-0000-0000-0000-000000000003'

const CLIENT_USER = { sub: CLIENT_ID, email: 'client@test.com', role: 'CLIENT', type: 'access' }
const COACH_USER  = { sub: COACH_ID,  email: 'coach@test.com',  role: 'COACH',  type: 'access' }
const ADMIN_USER  = { sub: ADMIN_ID,  email: 'admin@test.com',  role: 'ADMIN',  type: 'access' }

const MOCK_MSG = {
  id: '00000000-0000-0000-0000-000000000010',
  senderId: COACH_ID,
  recipientId: CLIENT_ID,
  coachId: COACH_ID,
  clientId: CLIENT_ID,
  body: 'Bonjour !',
  createdAt: new Date(),
  editedAt: null,
}

function makeEvent(overrides: Record<string, any> = {}) {
  return { context: {}, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/messages ────────────────────────────────────────────────────────
describe('GET /api/messages', () => {
  it('returns conversations for a CLIENT', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    mockMsgService.getConversations.mockResolvedValue([{ coachId: COACH_ID, messages: [] }])
    mockMsgService.countUnread.mockResolvedValue(2)

    const handler = (await import('../../server/api/messages/index.get')).default as any
    const result = await handler(makeEvent())

    expect(result.conversations).toHaveLength(1)
    expect(result.unreadTotal).toBe(2)
    expect(mockMsgService.getConversations).toHaveBeenCalledWith(CLIENT_ID, 'CLIENT')
  })

  it('returns conversations for a COACH', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockMsgService.getConversations.mockResolvedValue([])
    mockMsgService.countUnread.mockResolvedValue(0)

    const handler = (await import('../../server/api/messages/index.get')).default as any
    const result = await handler(makeEvent())

    expect(mockMsgService.getConversations).toHaveBeenCalledWith(COACH_ID, 'COACH')
    expect(result.unreadTotal).toBe(0)
  })

  it('returns admin↔coach conversations for an ADMIN', async () => {
    mockRequireAuth.mockResolvedValue(ADMIN_USER)
    mockMsgService.getAdminCoachConversations.mockResolvedValue([{ coachId: COACH_ID }])
    mockMsgService.countUnread.mockResolvedValue(1)

    const handler = (await import('../../server/api/messages/index.get')).default as any
    const result = await handler(makeEvent())

    expect(mockMsgService.getAdminCoachConversations).toHaveBeenCalledWith(ADMIN_ID)
    expect(result.conversations).toHaveLength(1)
  })
})

// ─── POST /api/messages ───────────────────────────────────────────────────────
describe('POST /api/messages', () => {
  it('allows COACH to send to assigned CLIENT', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockFindUnique.mockResolvedValue({ id: CLIENT_ID, role: 'CLIENT' })
    mockFindFirst.mockResolvedValue({ id: 'assign-1', status: 'ACCEPTED' })
    mockMsgService.sendMessage.mockResolvedValue(MOCK_MSG)

    const handler = (await import('../../server/api/messages/index.post')).default as any
    const result = await handler({ ...makeEvent(), _readBody: { toUserId: CLIENT_ID, body: 'Bonjour !' } })
    expect(result.message).toBeDefined()
  })

  it('allows ADMIN to send to a COACH', async () => {
    mockRequireAuth.mockResolvedValue(ADMIN_USER)
    mockFindUnique.mockResolvedValue({ id: COACH_ID, role: 'COACH' })
    mockMsgService.sendDirectMessage.mockResolvedValue(MOCK_MSG)

    const handler = (await import('../../server/api/messages/index.post')).default as any
    const result = await handler({ ...makeEvent(), _readBody: { toUserId: COACH_ID, body: 'Bonjour !' } })
    expect(result.message).toBeDefined()
  })

  it('throws 400 if body is empty', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)

    const handler = (await import('../../server/api/messages/index.post')).default as any
    await expect(
      handler({ ...makeEvent(), _readBody: { toUserId: CLIENT_ID, body: '' } })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

// ─── PATCH /api/messages/:id ──────────────────────────────────────────────────
describe('PATCH /api/messages/:id', () => {
  it('allows sender to edit their message within 15 min', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    const MSG_ID = '00000000-0000-0000-0000-000000000010'
    const recentMsg = { ...MOCK_MSG, senderId: COACH_ID, createdAt: new Date(Date.now() - 5 * 60_000) }
    mockMsgFindUnique.mockResolvedValue(recentMsg)
    mockMsgUpdate.mockResolvedValue({ ...recentMsg, body: 'Modifié', editedAt: new Date() })

    const handler = (await import('../../server/api/messages/[id].patch')).default as any
    const result = await handler({
      ...makeEvent(),
      _params: { id: MSG_ID },
      _readBody: { body: 'Modifié' },
    })
    expect(result.success).toBe(true)
    expect(mockMsgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MSG_ID } })
    )
  })

  it('throws 403 if edit window (15 min) is exceeded', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    const oldMsg = { ...MOCK_MSG, senderId: COACH_ID, createdAt: new Date(Date.now() - 20 * 60_000) }
    mockMsgFindUnique.mockResolvedValue(oldMsg)

    const handler = (await import('../../server/api/messages/[id].patch')).default as any
    await expect(
      handler({ ...makeEvent(), _params: { id: MOCK_MSG.id }, _readBody: { body: 'Modifié' } })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 403 if user is not the sender', async () => {
    mockRequireAuth.mockResolvedValue(CLIENT_USER)
    const msg = { ...MOCK_MSG, senderId: COACH_ID, createdAt: new Date(Date.now() - 1_000) }
    mockMsgFindUnique.mockResolvedValue(msg)

    const handler = (await import('../../server/api/messages/[id].patch')).default as any
    await expect(
      handler({ ...makeEvent(), _params: { id: MOCK_MSG.id }, _readBody: { body: 'Hack' } })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 404 if message does not exist', async () => {
    mockRequireAuth.mockResolvedValue(COACH_USER)
    mockMsgFindUnique.mockResolvedValue(null)

    const handler = (await import('../../server/api/messages/[id].patch')).default as any
    await expect(
      handler({ ...makeEvent(), _params: { id: MOCK_MSG.id }, _readBody: { body: 'Test' } })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
