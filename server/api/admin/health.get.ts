import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../middleware/admin.middleware'
import { prisma } from '../../utils/prisma'
import { Redis } from '@upstash/redis'

/**
 * GET /api/admin/health
 *
 * Returns infrastructure health status for the admin monitoring dashboard:
 *   - db:    PostgreSQL connectivity (Prisma $queryRaw ping)
 *   - redis: Upstash Redis connectivity + latency (or 'unconfigured' in dev)
 *   - crons: Last execution summary for each cron job (from SystemLog)
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  // ── 1. Database health ──────────────────────────────────────────────────
  let db: { status: 'ok' | 'error'; latencyMs?: number; error?: string }
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    db = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (err) {
    db = { status: 'error', latencyMs: Date.now() - dbStart, error: String(err) }
  }

  // ── 2. Redis health ─────────────────────────────────────────────────────
  let redis: { status: 'ok' | 'unconfigured' | 'error'; latencyMs?: number; error?: string }
  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    redis = { status: 'unconfigured' }
  } else {
    const redisStart = Date.now()
    try {
      const client = new Redis({ url: redisUrl, token: redisToken })
      await client.ping()
      redis = { status: 'ok', latencyMs: Date.now() - redisStart }
    } catch (err) {
      redis = { status: 'error', latencyMs: Date.now() - redisStart, error: String(err) }
    }
  }

  // ── 3. Cron job last-run history (from SystemLog) ───────────────────────
  const CRON_ACTIONS = [
    { action: 'CRON_EXPIRE_SUBSCRIPTIONS', label: 'Expiration abonnements' },
    { action: 'CRON_SEND_REMINDERS',       label: 'Rappels J-3 expiration' },
  ]

  const cronResults = await Promise.all(
    CRON_ACTIONS.map(async ({ action, label }) => {
      // Last 10 runs for history chart
      const logs = await prisma.systemLog.findMany({
        where: { action },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { createdAt: true, message: true, meta: true },
      })

      const last = logs[0] ?? null

      return {
        action,
        label,
        lastRanAt:   last?.createdAt ?? null,
        lastMessage: last?.message   ?? null,
        lastMeta:    last?.meta      ?? null,
        history:     logs.map(l => ({
          ranAt:   l.createdAt,
          message: l.message,
          meta:    l.meta,
        })),
      }
    })
  )

  // ── 4. Quick subscription stats ─────────────────────────────────────────
  const [activeCount, expiredToday, expiringIn3d] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({
      where: {
        status: 'EXPIRED',
        expiresAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: new Date(), lt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  return {
    checkedAt: new Date().toISOString(),
    db,
    redis,
    crons: cronResults,
    subscriptions: {
      active:       activeCount,
      expiredToday,
      expiringIn3d,
    },
  }
})
