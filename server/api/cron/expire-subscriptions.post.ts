import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  const authHeader = getRequestHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const now = new Date()

  // Expire ACTIVE subscriptions whose expiresAt has passed (skip paused ones)
  const { count } = await prisma.subscription.updateMany({
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

  return { success: true, expired: count, ranAt: now.toISOString() }
})
