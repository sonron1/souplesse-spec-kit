import { prisma } from './prisma'
import logger from './logger'

export type LogLevel = 'info' | 'warn' | 'error'

export interface SystemLogInput {
  level?: LogLevel
  action: string
  userId?: string | null
  target?: string | null
  message: string
  meta?: Record<string, unknown>
  ip?: string | null
}

/**
 * Fire-and-forget helper: writes a structured log entry to the `SystemLog`
 * table. Never throws — a DB failure is swallowed and printed to stderr only.
 *
 * Usage:
 *   systemLog({ action: 'USER_LOGIN', userId: user.id, message: '...' })
 */
export function systemLog(input: SystemLogInput): void {
  const { level = 'info', action, userId, target, message, meta, ip } = input

  prisma.systemLog
    .create({
      data: {
        level,
        action,
        userId: userId ?? null,
        target: target ?? null,
        message,
        meta: meta ? (meta as object) : undefined,
        ip: ip ?? null,
      },
    })
    .catch((err) => {
      logger.error({ err }, '[systemLog] Failed to write system log to DB')
    })
}
