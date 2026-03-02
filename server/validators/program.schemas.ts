import { z } from 'zod'
import { uuidSchema } from './index'

export const createProgramSchema = z.object({
  clientId: uuidSchema,
  type: z.enum(['GAIN', 'LOSS']),
  content: z.record(z.unknown()),
})

export const updateProgramSchema = z.object({
  type: z.enum(['GAIN', 'LOSS']).optional(),
  content: z.record(z.unknown()).optional(),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>
