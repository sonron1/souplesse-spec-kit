import { defineEventHandler } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'
import { statsService } from '../../services/stats.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)
  const stats = await statsService.getDashboardStats()
  return { success: true, stats }
})
