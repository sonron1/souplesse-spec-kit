import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware'

const cronRateLimit = rateLimitMiddleware({ max: 5, windowMs: 60_000, keyPrefix: 'cron-expire' })

export default defineEventHandler(async (event) => {
  await cronRateLimit(event)

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  // Fail CLOSED: if CRON_SECRET is not configured the endpoint is locked down
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getRequestHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const now = new Date()

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
  }
})
