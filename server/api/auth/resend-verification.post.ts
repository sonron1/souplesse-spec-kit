import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { validateBody } from '../../validators/index'
import { authService } from '../../services/auth.service'

const schema = z.object({
  email: z.string().email('Adresse email invalide').toLowerCase().trim(),
})

/**
 * POST /api/auth/resend-verification
 * Body: { email }
 *
 * Resends the email-verification link for an unverified account.
 * Always returns 200 regardless of whether the email exists, to prevent
 * user enumeration attacks.
 */
export default defineEventHandler(async (event) => {
  const { email } = await validateBody(event, schema)
  await authService.resendVerification(email)
  return { success: true, message: 'Si un compte non vérifié existe pour cet email, un nouveau lien vous a été envoyé.' }
})
