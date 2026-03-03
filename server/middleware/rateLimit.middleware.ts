import { defineEventHandler, getRequestIP, createError } from 'h3'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store — replace with Redis in production
const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  /** Max requests per window. Default: 60 */
  max?: number
  /** Window duration in milliseconds. Default: 60 000 (1 min) */
  windowMs?: number
  /** Key prefix to namespace buckets. Default: 'rl' */
  keyPrefix?: string
}

/**
 * Returns a Nitro event handler factory that applies rate limiting.
 *
 * Usage in a route:
 *   export default rateLimitMiddleware({ max: 5, windowMs: 60_000 })
 */
export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const { max = 60, windowMs = 60_000, keyPrefix = 'rl' } = options

  return defineEventHandler((event) => {
    const ip = getRequestIP(event) ?? 'unknown'
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()

    let entry = store.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
    }

    entry.count++
    if (entry.count > max) {
      throw createError({
        statusCode: 429,
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        data: { retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
      })
    }
  })
}

/**
 * Global loose rate limit: 200 req/min applied across all routes.
 * Export as default for Nitro to pick it up automatically.
 */
export default defineEventHandler((event) => {
  const ip = getRequestIP(event) ?? 'unknown'
  const key = `global:${ip}`
  const windowMs = 60_000
  const max = 200
  const now = Date.now()

  let entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs }
    store.set(key, entry)
  }

  entry.count++
  if (entry.count > max) {
    throw createError({
      statusCode: 429,
      message: 'Trop de requêtes, veuillez réessayer plus tard',
    })
  }
})
