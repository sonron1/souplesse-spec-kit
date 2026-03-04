import { z } from 'zod'
import { uuidSchema } from './index'

export const PROGRAM_TYPES = ['CARDIO', 'FULL_BODY', 'ABDO', 'UPPER_BODY', 'LOWER_BODY'] as const
export type ProgramTypeValue = typeof PROGRAM_TYPES[number]

export const createProgramSchema = z.object({
  clientId: uuidSchema,
  type: z.enum(PROGRAM_TYPES),
  content: z.record(z.unknown()),
})

export const updateProgramSchema = z.object({
  type: z.enum(PROGRAM_TYPES).optional(),
  content: z.record(z.unknown()).optional(),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>
