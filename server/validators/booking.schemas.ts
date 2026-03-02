import { z } from 'zod'
import { uuidSchema, paginationSchema } from './index'

export const createBookingSchema = z.object({
  sessionId: uuidSchema,
})

// Accept either a full ISO datetime or a plain date (YYYY-MM-DD)
const dateOrDatetime = z.string().refine(
  (v) => /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(v),
  { message: 'Expected a date (YYYY-MM-DD) or ISO datetime string' }
)

export const listSessionsQuerySchema = paginationSchema.extend({
  from: dateOrDatetime.optional(),
  to: dateOrDatetime.optional(),
})

export const createSessionSchema = z.object({
  dateTime: z.string().datetime(),
  duration: z.number().int().min(15).max(240),
  capacity: z.number().int().min(1).max(200),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
