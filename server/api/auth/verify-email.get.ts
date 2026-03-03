import { defineEventHandler, getQuery } from 'h3'
import { authService } from '../../services/auth.service'

/**
 * GET /api/auth/verify-email?token=<hex-token>
 *
 * Marks the user's emailVerified = true and clears the verification token.
 * The token was generated during registration and should be delivered to the
 * user via email (email provider integration required for production).
 *
 * Returns: { success: true, email }
 * Errors:  404 if token is invalid or already consumed
 */
export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)

  if (!token || typeof token !== 'string') {
    return { success: false, message: 'Token de vérification manquant.' }
  }

  const result = await authService.verifyEmail(token)
  return { success: true, email: result.email, message: 'Adresse email vérifiée avec succès.' }
})
