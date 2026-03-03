import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { GymSettingsSchema, OpeningHoursSchema } from '../../validators/settings.schemas'
import { updateGymSettings, upsertBusinessHours } from '../../services/settings.service'

const PayloadSchema = z.object({
  gym: GymSettingsSchema,
  openingHours: OpeningHoursSchema,
})

import { requireAdmin } from '../../middleware/admin.middleware'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Données invalides' })
  }

  const { gym, openingHours } = parsed.data

  const saved = await updateGymSettings(gym)

  // Transform openingHours to per-day entries for upsert
  interface BusinessHoursEntry {
    dayOfWeek: string
    openTime: string
    closeTime: string
    isHolidayOverride: boolean
  }
  const entries: BusinessHoursEntry[] = []
  const map: Record<string, string[]> = {
    mondayToFriday: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    saturday: ['SATURDAY'],
    sundayAndHolidays: ['SUNDAY'],
  }
  for (const key of Object.keys(map)) {
    const days = map[key]
    const period = openingHours[key as keyof typeof openingHours]
    for (const d of days) {
      entries.push({
        dayOfWeek: d,
        openTime: period.open,
        closeTime: period.close,
        isHolidayOverride: false,
      })
    }
  }

  await upsertBusinessHours(entries)

  return { ok: true, saved }
})
