import { describe, it, expect, beforeEach, vi } from 'vitest'

// Provide nitro-like globals used by the middleware
;(global as any).createError = (opts: any) => Object.assign(new Error(opts.statusMessage), { statusCode: opts.statusCode })

describe('requireAdmin middleware', () => {
  const JWT_SECRET = 'test-secret'

  beforeEach(() => {
    vi.resetModules()
    // mock jwt verification util used by middleware to avoid env dependence
    vi.mock('../../server/utils/jwt', () => ({
      verifyJwt: (token: string) => {
        if (token === 'badtoken') throw new Error('Invalid token')
        if (token === 'admin-token') return { sub: 'u1', role: 'ADMIN' }
        return { sub: 'u1', role: 'USER' }
      }
    }))
    // ensure no residual globals
    (global as any).getHeader = () => undefined
  })

  it('attaches user when token is valid and role is ADMIN', async () => {
    const token = 'admin-token'
    const event: any = { node: { req: { headers: { authorization: `Bearer ${token}` } } }, context: {} }

    const { requireAdmin } = await import('../../server/middleware/admin.middleware')
    const payload = await requireAdmin(event)
    expect(payload).toHaveProperty('sub', 'u1')
    expect(event.context.user).toBe(payload)
  })

  it('throws 401 when authorization header missing', async () => {
    const event: any = { context: {} }
    const { requireAdmin } = await import('../../server/middleware/admin.middleware')
    await expect(requireAdmin(event)).rejects.toThrow('Authorization required')
  })

  it('throws 401 when token invalid', async () => {
    const event: any = { node: { req: { headers: { authorization: 'Bearer badtoken' } } }, context: {} }
    const { requireAdmin } = await import('../../server/middleware/admin.middleware')
    await expect(requireAdmin(event)).rejects.toThrow('Invalid token')
  })
})
