import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../middleware/role.middleware'
import { validateQuery, paginationSchema } from '../../validators/index'
import { userRepository } from '../../repositories/user.repository'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const query = validateQuery(event, paginationSchema)
  const [users, total] = await Promise.all([
    userRepository.findAll({ page: query.page, limit: query.limit }),
    userRepository.count(),
  ])

  // Never expose passwordHash or refreshToken
  const safeUsers = users.map(({ passwordHash: _ph, refreshToken: _rt, ...rest }) => rest)
  return { success: true, users: safeUsers, total, page: query.page, limit: query.limit }
})
