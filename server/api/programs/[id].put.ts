import { defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireCoach } from '../../utils/role'
import { validateBody } from '../../validators/index'
import { updateProgramSchema } from '../../validators/program.schemas'
import { programService } from '../../services/program.service'
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireCoach(user)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant de programme manquant' })

  const body = await validateBody(event, updateProgramSchema)
  const program = await programService.updateProgram(id, user.sub, body)
  return { success: true, program }
})
