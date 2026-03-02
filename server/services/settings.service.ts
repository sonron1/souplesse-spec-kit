import { prisma } from '../utils/prisma'
import { BusinessConfigSchema } from '../validators/settings.schemas'

export async function getGymSettings() {
  const g = await prisma.gymSettings.findFirst()
  return g
}

export async function getBusinessHours() {
  return prisma.businessHours.findMany({ orderBy: { dayOfWeek: 'asc' } })
}

export async function getSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { createdAt: 'asc' } })
}

export async function updateGymSettings(data: any) {
  // Validate partial with Zod in caller; here we upsert
  const existing = await prisma.gymSettings.findFirst()
  if (existing) {
    return prisma.gymSettings.update({ where: { id: existing.id }, data })
  }
  return prisma.gymSettings.create({ data })
}

export async function upsertBusinessHours(entries: Array<any>) {
  for (const e of entries) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: e.dayOfWeek },
      update: { openTime: e.openTime, closeTime: e.closeTime, isHolidayOverride: !!e.isHolidayOverride },
      create: { dayOfWeek: e.dayOfWeek, openTime: e.openTime, closeTime: e.closeTime, isHolidayOverride: !!e.isHolidayOverride }
    })
  }
  return getBusinessHours()
}
