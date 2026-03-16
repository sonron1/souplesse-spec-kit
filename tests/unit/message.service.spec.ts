import { describe, it, expect, vi, beforeEach } from 'vitest'
import { messageService } from '../../server/services/message.service'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    coachClientAssignment: {
      findFirst: vi.fn(),
    },
  },
}))
vi.mock('../../server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'

const mockPrisma = vi.mocked(prisma)

const COACH_ID = 'coach-1'
const CLIENT_ID = 'client-1'
const READER_ID = CLIENT_ID

const MOCK_MESSAGE = {
  id: 'msg-1',
  senderId: COACH_ID,
  recipientId: CLIENT_ID,
  coachId: COACH_ID,
  clientId: CLIENT_ID,
  body: 'Bonjour !',
  readAt: null as Date | null,
  createdAt: new Date(),
  sender: { id: COACH_ID, name: 'Coach A', role: 'COACH' },
}

beforeEach(() => { vi.clearAllMocks() })

// ─── getConversation() ────────────────────────────────────────────────────────
describe('messageService.getConversation', () => {
  it('returns messages for a coach↔client pair', async () => {
    mockPrisma.message.findMany.mockResolvedValue([MOCK_MESSAGE] as never)
    mockPrisma.message.updateMany.mockResolvedValue({ count: 0 } as never)

    const result = await messageService.getConversation(COACH_ID, CLIENT_ID, READER_ID)
    const messages = Array.isArray(result) ? result : result.messages

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { coachId: COACH_ID, clientId: CLIENT_ID } })
    )
    expect(messages).toHaveLength(1)
    expect(messages[0].body).toBe('Bonjour !')
  })

  it('marks unread messages for the reader as read', async () => {
    const unreadMsg = { ...MOCK_MESSAGE, recipientId: READER_ID, readAt: null }
    mockPrisma.message.findMany.mockResolvedValue([unreadMsg] as never)
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 } as never)

    await messageService.getConversation(COACH_ID, CLIENT_ID, READER_ID)

    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { readAt: expect.any(Date) } })
    )
  })

  it('does not call updateMany when there are no unread messages', async () => {
    const readMsg = { ...MOCK_MESSAGE, readAt: new Date() }
    mockPrisma.message.findMany.mockResolvedValue([readMsg] as never)

    await messageService.getConversation(COACH_ID, CLIENT_ID, READER_ID)

    expect(mockPrisma.message.updateMany).not.toHaveBeenCalled()
  })
})

// ─── sendMessage() ────────────────────────────────────────────────────────────
describe('messageService.sendMessage', () => {
  const BASE_INPUT = {
    senderId: COACH_ID,
    recipientId: CLIENT_ID,
    coachId: COACH_ID,
    clientId: CLIENT_ID,
    body: 'Bonjour !',
    senderRole: 'COACH',
  }

  it('coach can send the first message', async () => {
    mockPrisma.message.create.mockResolvedValue(MOCK_MESSAGE as never)

    const result = await messageService.sendMessage(BASE_INPUT)
    expect(result.body).toBe('Bonjour !')
    expect(mockPrisma.message.create).toHaveBeenCalledOnce()
  })

  it('throws 400 for empty body', async () => {
    await expect(
      messageService.sendMessage({ ...BASE_INPUT, body: '   ' })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockPrisma.message.create).not.toHaveBeenCalled()
  })

  it('client can send a message to their assigned coach', async () => {
    const clientReply = { ...MOCK_MESSAGE, senderId: CLIENT_ID, recipientId: COACH_ID }
    mockPrisma.message.create.mockResolvedValue(clientReply as never)

    const result = await messageService.sendMessage({
      ...BASE_INPUT,
      senderId: CLIENT_ID,
      recipientId: COACH_ID,
      senderRole: 'CLIENT',
    })

    expect(result.senderId).toBe(CLIENT_ID)
    expect(mockPrisma.message.create).toHaveBeenCalledOnce()
  })
})

// ─── countUnread() ────────────────────────────────────────────────────────────
describe('messageService.countUnread', () => {
  it('returns unread message count for a recipient', async () => {
    mockPrisma.message.count.mockResolvedValue(4 as never)

    const count = await messageService.countUnread(CLIENT_ID)
    expect(count).toBe(4)
    expect(mockPrisma.message.count).toHaveBeenCalledWith({
      where: { recipientId: CLIENT_ID, readAt: null },
    })
  })
})

// ─── getConversations() ───────────────────────────────────────────────────────
describe('messageService.getConversations', () => {
  it('returns empty list for client with no assigned coach', async () => {
    mockPrisma.coachClientAssignment.findFirst.mockResolvedValue(null as never)

    const result = await messageService.getConversations(CLIENT_ID, 'CLIENT')
    expect(result).toEqual([])
  })

  it('returns coach summary for client with assigned coach', async () => {
    const mockAssignment = {
      coachId: COACH_ID,
      clientId: CLIENT_ID,
      coach: { id: COACH_ID, name: 'Coach A', email: 'coach@test.com' },
    }
    mockPrisma.coachClientAssignment.findFirst.mockResolvedValue(mockAssignment as never)
    mockPrisma.message.findFirst.mockResolvedValue(MOCK_MESSAGE as never)
    mockPrisma.message.count.mockResolvedValue(2 as never)

    const result = await messageService.getConversations(CLIENT_ID, 'CLIENT')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ coachId: COACH_ID, unreadCount: 2 })
  })

  it('returns empty list for coach with no conversations', async () => {
    mockPrisma.message.findMany.mockResolvedValue([] as never)

    const result = await messageService.getConversations(COACH_ID, 'COACH')
    expect(result).toEqual([])
  })

  it('returns conversations list for coach filtered to known clients', async () => {
    mockPrisma.message.findMany.mockResolvedValue([{ clientId: CLIENT_ID }] as never)
    mockPrisma.message.findFirst.mockResolvedValue(MOCK_MESSAGE as never)
    mockPrisma.message.count.mockResolvedValue(0 as never)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: CLIENT_ID,
      name: 'Client A',
      email: 'client@test.com',
    } as never)

    const result = await messageService.getConversations(COACH_ID, 'COACH')
    expect(result).toHaveLength(1)
    expect((result[0] as any).client.id).toBe(CLIENT_ID)
  })
})

// ─── getConversation() with pagination ────────────────────────────────────────
describe('messageService.getConversation — paginated', () => {
  it('returns paginated messages and pagination metadata', async () => {
    mockPrisma.message.findMany.mockResolvedValue([MOCK_MESSAGE] as never)
    mockPrisma.message.count.mockResolvedValue(1 as never)
    mockPrisma.message.updateMany.mockResolvedValue({ count: 0 } as never)

    const result = await messageService.getConversation(COACH_ID, CLIENT_ID, READER_ID, { page: 1, limit: 20 })

    expect('messages' in result).toBe(true)
    const { messages, pagination } = result as { messages: typeof MOCK_MESSAGE[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
    expect(messages).toHaveLength(1)
    expect(pagination.total).toBe(1)
    expect(pagination.page).toBe(1)
    expect(pagination.totalPages).toBe(1)
  })
})

// ─── getDirectThread() ────────────────────────────────────────────────────────
describe('messageService.getDirectThread', () => {
  const DIRECT_MSG = { ...MOCK_MESSAGE, clientId: null }

  it('returns messages for admin↔coach direct thread (no pagination)', async () => {
    mockPrisma.message.findMany.mockResolvedValue([DIRECT_MSG] as never)
    mockPrisma.message.updateMany.mockResolvedValue({ count: 0 } as never)

    const result = await messageService.getDirectThread(COACH_ID, COACH_ID)
    const messages = Array.isArray(result) ? result : result.messages

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { coachId: COACH_ID, clientId: null } })
    )
    expect(messages).toHaveLength(1)
  })

  it('marks unread direct messages as read', async () => {
    const unread = { ...DIRECT_MSG, recipientId: COACH_ID, readAt: null }
    mockPrisma.message.findMany.mockResolvedValue([unread] as never)
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 } as never)

    await messageService.getDirectThread(COACH_ID, COACH_ID)

    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { readAt: expect.any(Date) } })
    )
  })

  it('returns paginated result with pagination field', async () => {
    mockPrisma.message.findMany.mockResolvedValue([DIRECT_MSG] as never)
    mockPrisma.message.count.mockResolvedValue(5 as never)
    mockPrisma.message.updateMany.mockResolvedValue({ count: 0 } as never)

    const result = await messageService.getDirectThread(COACH_ID, COACH_ID, { page: 1, limit: 10 })

    expect('messages' in result).toBe(true)
    const { pagination } = result as { messages: unknown[]; pagination: { total: number } }
    expect(pagination.total).toBe(5)
  })
})

// ─── sendDirectMessage() ──────────────────────────────────────────────────────
describe('messageService.sendDirectMessage', () => {
  const BASE = {
    senderId: 'admin-1',
    recipientId: COACH_ID,
    coachId: COACH_ID,
    body: 'Réunion demain ?',
    senderRole: 'ADMIN',
  }

  it('admin can send a direct message to a coach', async () => {
    const created = { ...MOCK_MESSAGE, clientId: null, senderId: BASE.senderId, body: BASE.body }
    mockPrisma.message.create.mockResolvedValue(created as never)

    const result = await messageService.sendDirectMessage(BASE)
    expect(result.body).toBe('Réunion demain ?')
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clientId: null }) })
    )
  })

  it('throws 400 for empty body', async () => {
    await expect(
      messageService.sendDirectMessage({ ...BASE, body: '   ' })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockPrisma.message.create).not.toHaveBeenCalled()
  })

  it('throws 403 when sender is a CLIENT', async () => {
    await expect(
      messageService.sendDirectMessage({ ...BASE, senderRole: 'CLIENT' })
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockPrisma.message.create).not.toHaveBeenCalled()
  })

  it('coach can reply in a direct thread', async () => {
    const reply = { ...MOCK_MESSAGE, clientId: null, senderId: COACH_ID, body: 'Oui, 14h ?' }
    mockPrisma.message.create.mockResolvedValue(reply as never)

    const result = await messageService.sendDirectMessage({ ...BASE, senderId: COACH_ID, senderRole: 'COACH' })
    expect(result.senderId).toBe(COACH_ID)
  })
})

// ─── getAdminCoachConversations() ─────────────────────────────────────────────
describe('messageService.getAdminCoachConversations', () => {
  it('returns empty list when no direct threads exist', async () => {
    mockPrisma.message.findMany.mockResolvedValue([] as never)

    const result = await messageService.getAdminCoachConversations('admin-1')
    expect(result).toEqual([])
  })

  it('returns conversation summaries for each coach thread', async () => {
    mockPrisma.message.findMany.mockResolvedValue([{ coachId: COACH_ID }] as never)
    mockPrisma.message.findFirst.mockResolvedValue(MOCK_MESSAGE as never)
    mockPrisma.message.count.mockResolvedValue(3 as never)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: COACH_ID, name: 'Coach A', email: 'coach@test.com',
    } as never)

    const result = await messageService.getAdminCoachConversations('admin-1')
    expect(result).toHaveLength(1)
    expect(result[0].coachId).toBe(COACH_ID)
    expect(result[0].unreadCount).toBe(3)
  })
})
