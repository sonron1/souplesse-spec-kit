/**
 * Unit tests for server/utils/cronLock.ts
 *
 * Tests cover:
 *  - In-memory fallback (no Redis env vars): acquire, conflict, release, TTL expiry
 *  - Redis path (mocked): acquire (SET NX → 'OK'), conflict (SET NX → null), release (DEL)
 *  - releaseCronLock is non-fatal when Redis.del throws
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock @upstash/redis ────────────────────────────────────────────────────────
const mockSet = vi.fn()
const mockDel = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    set(...args: any[]) { return mockSet(...args) }
    del(...args: any[]) { return mockDel(...args) }
  },
}))

// ── Mock logger ───────────────────────────────────────────────────────────────
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ─── In-memory path (no env vars) ─────────────────────────────────────────────
describe('cronLock — in-memory fallback (no Redis env vars)', () => {
  let acquireCronLock: typeof import('../../server/utils/cronLock').acquireCronLock
  let releaseCronLock: typeof import('../../server/utils/cronLock').releaseCronLock

  beforeEach(async () => {
    // Ensure Redis env vars are absent so the module uses the in-memory path
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.clearAllMocks()
    // Re-import fresh module instance (avoids singleton state from other test files)
    vi.resetModules()
    const mod = await import('../../server/utils/cronLock')
    acquireCronLock = mod.acquireCronLock
    releaseCronLock = mod.releaseCronLock
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('acquires lock when key is free', async () => {
    expect(await acquireCronLock('test:lock-a', 60)).toBe(true)
  })

  it('returns false when lock is already held', async () => {
    await acquireCronLock('test:lock-b', 60)
    expect(await acquireCronLock('test:lock-b', 60)).toBe(false)
  })

  it('allows re-acquisition after release', async () => {
    await acquireCronLock('test:lock-c', 60)
    await releaseCronLock('test:lock-c')
    expect(await acquireCronLock('test:lock-c', 60)).toBe(true)
  })

  it('allows re-acquisition after TTL expires', async () => {
    vi.useFakeTimers()
    await acquireCronLock('test:lock-d', 1) // 1-second TTL
    expect(await acquireCronLock('test:lock-d', 1)).toBe(false) // still held

    vi.advanceTimersByTime(1_001) // advance past 1-second TTL
    expect(await acquireCronLock('test:lock-d', 1)).toBe(true)  // expired — re-acquired
  })

  it('different keys are independent', async () => {
    await acquireCronLock('test:lock-e1', 60)
    // e2 is a different key — should not be blocked
    expect(await acquireCronLock('test:lock-e2', 60)).toBe(true)
  })

  it('releaseCronLock on a never-acquired key is a no-op', async () => {
    await expect(releaseCronLock('test:lock-never')).resolves.toBeUndefined()
  })
})

// ─── Redis path ───────────────────────────────────────────────────────────────
describe('cronLock — Redis path', () => {
  let acquireCronLock: typeof import('../../server/utils/cronLock').acquireCronLock
  let releaseCronLock: typeof import('../../server/utils/cronLock').releaseCronLock

  beforeEach(async () => {
    // Set Redis env vars so the module initialises the Redis client
    process.env.UPSTASH_REDIS_REST_URL   = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../../server/utils/cronLock')
    acquireCronLock = mod.acquireCronLock
    releaseCronLock = mod.releaseCronLock
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('acquires lock when Redis SET NX returns "OK"', async () => {
    mockSet.mockResolvedValue('OK')
    expect(await acquireCronLock('cron:test', 240)).toBe(true)
    expect(mockSet).toHaveBeenCalledWith('cron:test', '1', { nx: true, ex: 240 })
  })

  it('returns false when Redis SET NX returns null (key already exists)', async () => {
    mockSet.mockResolvedValue(null)
    expect(await acquireCronLock('cron:test', 240)).toBe(false)
  })

  it('releases lock by calling Redis DEL', async () => {
    mockDel.mockResolvedValue(1)
    await releaseCronLock('cron:test')
    expect(mockDel).toHaveBeenCalledWith('cron:test')
  })

  it('releaseCronLock swallows Redis DEL errors (non-fatal)', async () => {
    mockDel.mockRejectedValue(new Error('Connection reset'))
    await expect(releaseCronLock('cron:test')).resolves.toBeUndefined()
  })
})
