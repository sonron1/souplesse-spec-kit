import { z, ZodError, ZodSchema } from 'zod'
import { H3Event, readBody, getQuery } from 'h3'

// ─── Re-export commonly used Zod primitives ──────────────────────────────────
export { z }
export type { ZodSchema }

// ─── Validation Error ─────────────────────────────────────────────────────────
export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[]
  public readonly statusCode = 422

  constructor(error: ZodError) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.issues = error.issues
  }

  toJSON() {
    return {
      error: 'Validation failed',
      issues: this.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      })),
    }
  }
}

// ─── Body Validation ─────────────────────────────────────────────────────────
/**
 * Read the request body and validate it against a Zod schema.
 * Throws a ValidationError (HTTP 422) on failure.
 */
export async function validateBody<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ValidationError(result.error)
  }
  return result.data
}

// ─── Query Validation ────────────────────────────────────────────────────────
/**
 * Read query parameters and validate against a Zod schema.
 * Throws a ValidationError (HTTP 422) on failure.
 */
export function validateQuery<T>(event: H3Event, schema: ZodSchema<T>): T {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) {
    throw new ValidationError(result.error)
  }
  return result.data
}

// ─── Sanitization Helpers ────────────────────────────────────────────────────
/** Trim all string fields recursively (shallow one level). */
export function sanitizeStrings<T extends Record<string, unknown>>(input: T): T {
  const result = { ...input }
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      ;(result as Record<string, unknown>)[key] = (result[key] as string).trim()
    }
  }
  return result
}

// ─── Common Schema Fragments ────────────────────────────────────────────────
export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const emailSchema = z.string().email().toLowerCase().trim()

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
