import { z } from 'zod'
import { uuidSchema, paginationSchema } from './index'

export const createBookingSchema = z.object({
  sessionId: uuidSchema,
})

export const listSessionsQuerySchema = paginationSchema.extend({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const createSessionSchema = z.object({
  dateTime: z.string().datetime(),
  duration: z.number().int().min(15).max(240),
  capacity: z.number().int().min(1).max(200),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
