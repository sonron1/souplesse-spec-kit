import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock h3 ─────────────────────────────────────────────────────────────────
const mockGetRequestHeader = vi.fn()

vi.mock('h3', () => {
  const createError = (opts: { statusCode: number; message: string }) => {
    const e = new Error(opts.message) as any
    e.statusCode = opts.statusCode
    return e
  }
  const defineEventHandler = (fn: (e: any) => any) => fn
  return {
    createError,
    defineEventHandler,
    getRequestHeader: (...args: any[]) => mockGetRequestHeader(...args),
  }
})

function makeEvent(method: string, headers: Record<string, string | undefined> = {}) {
  return {
    node: { req: { method, url: '/api/some-route' } },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRequestHeader.mockReturnValue(undefined)
})

// Helper to read header by name from a headers map
function headersFor(map: Record<string, string | undefined>) {
  return (_event: any, name: string) => map[name]
}

describe('csrf middleware', () => {
  it('allows GET requests without any origin check', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = makeEvent('GET')
    mockGetRequestHeader.mockImplementation(headersFor({}))
    expect(() => handler(event)).not.toThrow()
  })

  it('allows POST when no Origin or Referer is present (server-to-server)', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = makeEvent('POST')
    mockGetRequestHeader.mockImplementation(headersFor({}))
    expect(() => handler(event)).not.toThrow()
  })

  it('allows POST when Origin matches Host', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = makeEvent('POST')
    mockGetRequestHeader.mockImplementation(headersFor({
      origin: 'https://souplesse.app',
      host: 'souplesse.app',
    }))
    expect(() => handler(event)).not.toThrow()
  })

  it('throws 403 when Origin does not match Host', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = makeEvent('POST')
    mockGetRequestHeader.mockImplementation(headersFor({
      origin: 'https://evil.attacker.com',
      host: 'souplesse.app',
    }))
    expect(() => handler(event)).toThrowError()
    const err = (() => {
      try { handler(event) } catch (e: any) { return e }
    })()
    expect(err.statusCode).toBe(403)
    expect(err.message).toMatch(/CSRF/)
  })

  it('throws 403 when Referer does not match Host (no Origin)', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = makeEvent('DELETE')
    mockGetRequestHeader.mockImplementation(headersFor({
      referer: 'https://evil.com/page',
      host: 'souplesse.app',
    }))
    expect(() => handler(event)).toThrowError()
    const err = (() => {
      try { handler(event) } catch (e: any) { return e }
    })()
    expect(err.statusCode).toBe(403)
  })

  it('allows Referer that matches Host', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = makeEvent('PATCH')
    mockGetRequestHeader.mockImplementation(headersFor({
      referer: 'https://souplesse.app/dashboard',
      host: 'souplesse.app',
    }))
    expect(() => handler(event)).not.toThrow()
  })

  it('exempts KKiaPay webhook URL from CSRF check', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any
    const event = { node: { req: { method: 'POST', url: '/api/payments/kkiapay.webhook' } } }
    mockGetRequestHeader.mockImplementation(headersFor({
      origin: 'https://kkiapay.me',
      host: 'souplesse.app',
    }))
    // must NOT throw, because the webhook is exempt
    expect(() => handler(event)).not.toThrow()
  })

  it('applies check to PUT and PATCH methods too', async () => {
    const handler = (await import('../../server/middleware/csrf.middleware')).default as any

    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const event = makeEvent(method)
      mockGetRequestHeader.mockImplementation(headersFor({
        origin: 'https://evil.com',
        host: 'souplesse.app',
      }))
      expect(() => handler(event)).toThrowError()
    }
  })
})
