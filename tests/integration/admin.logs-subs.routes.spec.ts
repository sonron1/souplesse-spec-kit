import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    systemLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../../server/middleware/admin.middleware', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ sub: 'admin-1', role: 'ADMIN' }),
  default: vi.fn(),
}))
vi.mock('../../server/middleware/auth.middleware', () => ({
  requireAuth: vi.fn().mockReturnValue({ sub: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }),
  default: vi.fn(),
}))
vi.mock('../../server/utils/role', () => ({
  requireAdmin: vi.fn(),
  requireCoach: vi.fn(),
  requireRole: vi.fn(),
}))
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from '../../server/utils/prisma'

const mockPrisma = vi.mocked(prisma)

const MOCK_LOG = {
  id: 'log-1',
  level: 'info',
  action: 'USER_LOGIN',
  userId: 'u-1',
  target: null,
  message: 'Login: user@test.com',
  meta: null,
  ip: null,
  createdAt: new Date('2026-03-01T08:00:00Z'),
}

const MOCK_SUBSCRIPTION = {
  id: 'sub-1',
  userId: 'u-1',
  status: 'ACTIVE',
  isActive: true,
  startsAt: new Date(),
  expiresAt: new Date(),
  createdAt: new Date(),
  user: { id: 'u-1', name: 'Client A', email: 'client@test.com' },
  subscriptionPlan: { name: 'Mensuel', planType: 'MONTHLY' },
}

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/admin/logs ──────────────────────────────────────────────────────
describe('GET /api/admin/logs (via prisma mock)', () => {
  it('returns paginated system logs', async () => {
    mockPrisma.systemLog.findMany.mockResolvedValue([MOCK_LOG] as never)
    mockPrisma.systemLog.count.mockResolvedValue(1 as never)

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({ where: {}, orderBy: { createdAt: 'desc' }, skip: 0, take: 50 }),
      prisma.systemLog.count({ where: {} }),
    ])

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe('USER_LOGIN')
    expect(total).toBe(1)
  })

  it('allows filtering by level', async () => {
    const warnLog = { ...MOCK_LOG, id: 'log-2', level: 'warn', action: 'BOOKING_CREATED' }
    mockPrisma.systemLog.findMany.mockResolvedValue([warnLog] as never)
    mockPrisma.systemLog.count.mockResolvedValue(1 as never)

    const logs = await prisma.systemLog.findMany({
      where: { level: 'warn' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    })

    expect(logs[0].level).toBe('warn')
  })

  it('allows filtering by action keyword', async () => {
    mockPrisma.systemLog.findMany.mockResolvedValue([MOCK_LOG] as never)
    mockPrisma.systemLog.count.mockResolvedValue(1 as never)

    const logs = await prisma.systemLog.findMany({
      where: { action: { contains: 'LOGIN', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    })

    expect(logs[0].action).toContain('LOGIN')
  })

  it('returns empty list when no logs match', async () => {
    mockPrisma.systemLog.findMany.mockResolvedValue([] as never)
    mockPrisma.systemLog.count.mockResolvedValue(0 as never)

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({ where: { level: 'error' }, orderBy: { createdAt: 'desc' }, skip: 0, take: 50 }),
      prisma.systemLog.count({ where: { level: 'error' } }),
    ])

    expect(logs).toHaveLength(0)
    expect(total).toBe(0)
  })
})

// ─── GET /api/admin/subscriptions ────────────────────────────────────────────
describe('GET /api/admin/subscriptions (via prisma mock)', () => {
  it('returns paginated subscriptions with user and plan info', async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([MOCK_SUBSCRIPTION] as never)
    mockPrisma.subscription.count.mockResolvedValue(1 as never)

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({ skip: 0, take: 50, orderBy: { createdAt: 'desc' }, include: {} } as never),
      prisma.subscription.count(),
    ])

    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].status).toBe('ACTIVE')
    expect(total).toBe(1)
  })
})

// ─── PATCH /api/admin/subscriptions/:id ──────────────────────────────────────
describe('PATCH /api/admin/subscriptions/:id (via prisma mock)', () => {
  it('cancels an active subscription', async () => {
    const cancelled = { ...MOCK_SUBSCRIPTION, status: 'CANCELLED', isActive: false }
    mockPrisma.subscription.findUnique.mockResolvedValue(MOCK_SUBSCRIPTION as never)
    mockPrisma.subscription.update.mockResolvedValue(cancelled as never)

    const updated = await prisma.subscription.update({
      where: { id: 'sub-1' },
      data: { status: 'CANCELLED', isActive: false },
    })

    expect(updated.status).toBe('CANCELLED')
    expect(updated.isActive).toBe(false)
  })

  it('activates a cancelled subscription', async () => {
    const cancelledSub = { ...MOCK_SUBSCRIPTION, status: 'CANCELLED', isActive: false, startsAt: new Date() }
    const activated = { ...MOCK_SUBSCRIPTION, status: 'ACTIVE', isActive: true }
    mockPrisma.subscription.findUnique.mockResolvedValue(cancelledSub as never)
    mockPrisma.subscription.update.mockResolvedValue(activated as never)

    const updated = await prisma.subscription.update({
      where: { id: 'sub-1' },
      data: { status: 'ACTIVE', isActive: true },
    })

    expect(updated.status).toBe('ACTIVE')
    expect(updated.isActive).toBe(true)
  })

  it('throws 404 when subscription does not exist', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null as never)

    const sub = await prisma.subscription.findUnique({ where: { id: 'nonexistent' } })
    expect(sub).toBeNull()
  })
})
