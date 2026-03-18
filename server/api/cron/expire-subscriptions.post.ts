import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'
import { acquireCronLock, releaseCronLock } from '../../utils/cronLock'
import logger from '../../utils/logger'

const cronRateLimit = rateLimitMiddleware({ max: 5, windowMs: 60_000, keyPrefix: 'cron-expire' })

const LOCK_KEY     = 'cron:expire-subscriptions'
const LOCK_TTL_SEC = 4 * 60 // 4 min — job must finish before next 5-min cron fires

export default defineEventHandler(async (event) => {
  await cronRateLimit(event)

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  // Fail CLOSED: if CRON_SECRET is not configured the endpoint is locked down
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getRequestHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Distributed lock — prevents concurrent execution across serverless instances
  const acquired = await acquireCronLock(LOCK_KEY, LOCK_TTL_SEC)
  if (!acquired) {
    logger.warn('[cron:expire-subscriptions] Another instance is already running — skipping')
    return { success: true, skipped: true, reason: 'concurrent_lock' }
  }

  const now = new Date()
  const startedAt = Date.now()

  try {
    // 1. Expire ACTIVE subscriptions whose expiresAt has passed (skip paused ones)
    const { count: normalExpired } = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
        pausedAt: null,
      },
      data: {
        status: 'EXPIRED',
        isActive: false,
      },
    })

    // 2. Expire paused subscriptions whose pausedUntil deadline has passed.
    //    Prevents indefinite pausing to keep a subscription alive forever.
    const { count: pauseExpired } = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        pausedAt: { not: null },
        pausedUntil: { lt: now },
      },
      data: {
        status: 'EXPIRED',
        isActive: false,
        pausedAt: null,
        pausedUntil: null,
      },
    })

    return {
      success: true,
      expired: normalExpired + pauseExpired,
      normalExpired,
      pauseExpired,
      ranAt: now.toISOString(),
      durationMs: Date.now() - startedAt,
    }
  } finally {
    await releaseCronLock(LOCK_KEY)
  }
})
