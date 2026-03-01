import { defineEventHandler } from 'h3'
import { validateBody } from '../../validators/index'
import { registerSchema } from '../../validators/auth.schemas'
import { authService } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, registerSchema)
  const result = await authService.register(body)
  return { success: true, ...result }
})
