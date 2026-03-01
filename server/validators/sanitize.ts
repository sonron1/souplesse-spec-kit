import { z } from 'zod'

/**
 * Strips HTML tags and trims string fields for XSS prevention.
 * Use with Zod .transform() on any text field.
 */
export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Zod transformer: sanitizes and trims a string field.
 */
export const sanitizedString = z.string().transform(sanitizeHtml)

/**
 * Zod transformer: normalizes email (lowercase + trim).
 */
export const sanitizedEmail = z.string().email().toLowerCase().trim()

/**
 * Recursively sanitize all string values in an object (shallow).
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    const val = result[key]
    if (typeof val === 'string') {
      result[key] = sanitizeHtml(val) as T[keyof T]
    }
  }
  return result
}
