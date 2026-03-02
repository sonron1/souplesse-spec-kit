import { defineEventHandler } from 'h3'
import { validateBody } from '../../validators/index'
import { loginSchema } from '../../validators/auth.schemas'
import { authService } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, loginSchema)
  const result = await authService.login(body)
  return { success: true, ...result }
})
