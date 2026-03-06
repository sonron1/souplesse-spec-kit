import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireCoach } from '../../utils/role'
import { validateBody } from '../../validators/index'
import { createProgramSchema } from '../../validators/program.schemas'
import { programService } from '../../services/program.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireCoach(user)

  const body = await validateBody(event, createProgramSchema)
  const program = await programService.createProgram(user.sub, body)
  return { success: true, program }
})
