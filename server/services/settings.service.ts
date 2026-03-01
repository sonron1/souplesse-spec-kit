import { prisma } from '../utils/prisma'

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

export async function updateGymSettings(data: Record<string, unknown>) {
  // Validate partial with Zod in caller; here we upsert
  const existing = await prisma.gymSettings.findFirst()
  if (existing) {
    return prisma.gymSettings.update({ where: { id: existing.id }, data })
  }
  return prisma.gymSettings.create({ data })
}

interface BusinessHoursEntry {
  dayOfWeek: string
  openTime: string
  closeTime: string
  isHolidayOverride?: boolean
}

export async function upsertBusinessHours(entries: BusinessHoursEntry[]) {
  for (const e of entries) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: e.dayOfWeek },
      update: {
        openTime: e.openTime,
        closeTime: e.closeTime,
        isHolidayOverride: !!e.isHolidayOverride,
      },
      create: {
        dayOfWeek: e.dayOfWeek,
        openTime: e.openTime,
        closeTime: e.closeTime,
        isHolidayOverride: !!e.isHolidayOverride,
      },
    })
  }
  return getBusinessHours()
}
