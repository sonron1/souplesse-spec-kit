import { getGymSettings, getBusinessHours, getSubscriptionPlans } from '../../services/settings.service'
import { requireAdmin } from '../../middleware/admin.middleware'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const gym = await getGymSettings()
  const hours = await getBusinessHours()
  const plans = await getSubscriptionPlans()
  return { gym, hours, plans }
})
