import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { userRepository } from '../../repositories/user.repository'
import { authService } from '../../services/auth.service'

/**
 * POST /api/auth/avatar — upload a profile picture (A012)
 *
 * Accepts:
 *  - multipart/form-data with field "avatar" (image file) — stores as data URL (dev/stub)
 *  - OR JSON body { avatarUrl: string } to set an external URL directly
 *
 * Production: replace the data-URL branch with Vercel Blob / S3 upload.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Try multipart first
  const parts = await readMultipartFormData(event).catch(() => null)
  if (parts && parts.length > 0) {
    const avatarPart = parts.find((p) => p.name === 'avatar')
    if (!avatarPart || !avatarPart.data) {
      throw createError({ statusCode: 400, message: 'Champ "avatar" manquant dans le formulaire' })
    }

    const mime = avatarPart.type ?? 'image/jpeg'
    if (!mime.startsWith('image/')) {
      throw createError({ statusCode: 400, message: 'Le fichier doit être une image' })
    }
    if (avatarPart.data.length > 2 * 1024 * 1024) {
      throw createError({ statusCode: 413, message: "L'image ne doit pas dépasser 2 Mo" })
    }

    // Stub: store as base64 data URL (replace with blob upload in production)
    const base64 = avatarPart.data.toString('base64')
    const avatarUrl = `data:${mime};base64,${base64}`

    await userRepository.update(user.sub, { avatarUrl })
    return authService.getProfile(user.sub)
  }

  throw createError({ statusCode: 400, message: 'Envoyez le fichier en multipart/form-data avec le champ "avatar"' })
})
