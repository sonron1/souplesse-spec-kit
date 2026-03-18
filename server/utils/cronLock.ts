/**
 * Distributed cron-job locking via Upstash Redis (SETNX + EX).
 *
 * Guarantees at-most-once execution per TTL window across all serverless
 * instances. Falls back to an in-process Map when Redis env vars are not set
 * (local dev, CI, tests).
 *
 * Usage:
 *   const acquired = await acquireCronLock('cron:expire-subscriptions', 240)
 *   if (!acquired) return { skipped: true }
 *   try { ... } finally { await releaseCronLock('cron:expire-subscriptions') }
 */

import { Redis } from '@upstash/redis'
import logger from './logger'

// ── Lazy Redis singleton ───────────────────────────────────────────────────────
let _redis: Redis | null = null
let _initialized = false

function getRedis(): Redis | null {
  if (_initialized) return _redis
  _initialized = true
  const url   = process.env.UPSTASH_REDIS_REST_URL
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

// ── In-memory fallback ────────────────────────────────────────────────────────
// Stores lock expiry timestamps per key. Prevents duplicate runs within the
// same process (useful in dev and test environments).
const localLocks = new Map<string, number>() // key → expiresAt (ms epoch)

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Try to acquire an exclusive lock for `key`.
 *
 * @param key      Unique lock name, e.g. `'cron:expire-subscriptions'`
 * @param ttlSecs  Lock TTL in seconds. Set to slightly less than the cron
 *                 interval so a crashed job does not block the next run forever.
 *                 Must exceed the worst-case job execution time.
 * @returns `true`  — lock acquired, proceed with the job
 *          `false` — another instance already holds the lock, skip this run
 */
export async function acquireCronLock(key: string, ttlSecs: number): Promise<boolean> {
  const redis = getRedis()

  if (redis) {
    // SET key '1' NX EX ttlSecs — atomic: sets only when key does not exist
    const result = await redis.set(key, '1', { nx: true, ex: ttlSecs })
    return result === 'OK'
  }

  // ── In-memory fallback ────────────────────────────────────────────────────
  const now = Date.now()
  const existing = localLocks.get(key)
  if (existing !== undefined && existing > now) {
    return false // lock still held
  }
  localLocks.set(key, now + ttlSecs * 1_000)
  return true
}

/**
 * Release a previously acquired lock.
 * Safe to call even if the lock was never acquired or has already expired.
 */
export async function releaseCronLock(key: string): Promise<void> {
  const redis = getRedis()

  if (redis) {
    try {
      await redis.del(key)
    } catch (e) {
      // Non-fatal: the lock will expire on its own after ttlSecs
      logger.warn({ key, err: e }, '[releaseCronLock] Failed to release lock — will expire automatically')
    }
    return
  }

  // ── In-memory fallback ────────────────────────────────────────────────────
  localLocks.delete(key)
}
