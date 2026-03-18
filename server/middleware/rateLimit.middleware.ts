import { defineEventHandler, getRequestIP, createError } from 'h3'
import { Redis } from '@upstash/redis'

// ── In-memory fallback store ──────────────────────────────────────────────────
interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Purge expired entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 5 * 60 * 1000).unref()

// ── Upstash Redis (lazy singleton) ───────────────────────────────────────────
let _redis: Redis | null = null
let _redisInitialized = false

function getRedis(): Redis | null {
  if (_redisInitialized) return _redis
  _redisInitialized = true
  const url  = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    try {
      _redis = new Redis({ url, token })
    } catch {
      _redis = null
    }
  }
  return _redis
}

// ── Core rate-limit check (Redis first, in-memory fallback) ───────────────────
async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ count: number; resetAt: number }> {
  const redis = getRedis()
  const now = Date.now()

  if (redis) {
    const ttlSeconds = Math.ceil(windowMs / 1000)
    // INCR is atomic; EXPIRE NX sets the TTL only when the key is first created.
    // Together they implement a fixed-window counter without resetting the window
    // on every request.
    const [count] = await redis
      .pipeline()
      .incr(key)
      .expire(key, ttlSeconds, 'NX')
      .exec() as [number, ...unknown[]]
    return { count, resetAt: now + windowMs }
  }

  // ── In-memory fallback ────────────────────────────────────────────────────
  let entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs }
    store.set(key, entry)
  }
  entry.count++
  return { count: entry.count, resetAt: entry.resetAt }
}

// ── Options ───────────────────────────────────────────────────────────────────
interface RateLimitOptions {
  /** Max requests per window. Default: 60 */
  max?: number
  /** Window duration in milliseconds. Default: 60 000 (1 min) */
  windowMs?: number
  /** Key prefix to namespace buckets. Default: 'rl' */
  keyPrefix?: string
}

// ── Factory ───────────────────────────────────────────────────────────────────
/**
 * Returns an async Nitro event handler that applies per-IP rate limiting.
 *
 * Usage in a route:
 *   const myLimit = rateLimitMiddleware({ max: 10, windowMs: 60_000 })
 *   export default defineEventHandler(async (event) => {
 *     await myLimit(event)
 *     // …handler logic
 *   })
 */
export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const { max = 60, windowMs = 60_000, keyPrefix = 'rl' } = options

  return defineEventHandler(async (event) => {
    const ip  = getRequestIP(event) ?? 'unknown'
    const key = `${keyPrefix}:${ip}`

    const { count, resetAt } = await checkRateLimit(key, max, windowMs)
    if (count > max) {
      throw createError({
        statusCode: 429,
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        data: { retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
      })
    }
  })
}

// ── Global default (200 req/min applied to every route) ───────────────────────
export default defineEventHandler(async (event) => {
  const ip  = getRequestIP(event) ?? 'unknown'
  const key = `global:${ip}`

  const { count } = await checkRateLimit(key, 200, 60_000)
  if (count > 200) {
    throw createError({
      statusCode: 429,
      message: 'Trop de requêtes, veuillez réessayer plus tard',
    })
  }
})
