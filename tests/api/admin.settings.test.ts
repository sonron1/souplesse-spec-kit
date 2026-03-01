import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock h3 so defineEventHandler is a passthrough and readBody returns event.body
vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  readBody: async (ev: any) => ev.body,
  createError: (opts: any) =>
    Object.assign(new Error(opts.statusMessage), { statusCode: opts.statusCode }),
  getHeader: (ev: any, name: string) => ev.node?.req?.headers?.[name.toLowerCase()],
  setHeader: () => {},
}))

describe('admin settings handlers', () => {
  const JWT_SECRET = 'test-secret'

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret'
    vi.resetModules()
  })

  it('GET handler returns gym, hours, plans after admin check', async () => {
    // mock services
    const mockGym = { name: 'G' }
    const mockHours: unknown[] = []
    const mockPlans: unknown[] = []

    // mock requireAdmin to be a no-op
    const stubRequireAdmin = vi.fn().mockResolvedValue({ sub: 'u1', role: 'ADMIN' })

    // substitute the actual service module with a stub
    vi.doMock('../../server/services/settings.service', () => ({
      getGymSettings: async () => mockGym,
      getBusinessHours: async () => mockHours,
      getSubscriptionPlans: async () => mockPlans,
    }))

    // ensure requireAdmin is the stub
    vi.doMock('../../server/middleware/admin.middleware', () => ({
      requireAdmin: stubRequireAdmin,
    }))

    const handler = (await import('../../server/api/admin/settings.get')).default

    const event: any = {
      node: {
        req: {
          headers: {
            authorization: 'Bearer ' + jwt.sign({ sub: 'u1', role: 'ADMIN' }, JWT_SECRET),
          },
        },
      },
      context: {},
    }
    const res = await handler(event)
    expect(res).toEqual({ gym: mockGym, hours: mockHours, plans: mockPlans })
    expect(stubRequireAdmin).toHaveBeenCalled()
  })

  it('PUT handler validates payload and calls services', async () => {
    const savedGym = { id: 'g1' }
    const updateGymSettings = vi.fn().mockResolvedValue(savedGym)
    const upsertBusinessHours = vi.fn().mockResolvedValue(true)

    vi.doMock('../../server/services/settings.service', () => ({
      updateGymSettings,
      upsertBusinessHours,
    }))
    vi.doMock('../../server/middleware/admin.middleware', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ role: 'ADMIN' }),
    }))

    const handler = (await import('../../server/api/admin/settings.put')).default

    const mockBody = {
      gym: { name: 'New Gym', currency: 'USD' },
      openingHours: {
        mondayToFriday: { open: '08:00', close: '20:00' },
        saturday: { open: '09:00', close: '14:00' },
        sundayAndHolidays: { open: '00:00', close: '00:00' },
      },
    }

    const event: any = {
      body: mockBody,
      node: {
        req: { headers: { authorization: 'Bearer ' + jwt.sign({ role: 'ADMIN' }, JWT_SECRET) } },
      },
      context: {},
    }
    const res = await handler(event)
    expect(res).toHaveProperty('ok', true)
    expect(updateGymSettings).toHaveBeenCalled()
    expect(upsertBusinessHours).toHaveBeenCalled()
  })
})
