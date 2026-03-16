import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/utils/prisma', () => ({
  prisma: {
    gymSettings: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    businessHours: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    subscriptionPlan: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../../server/utils/prisma'
import {
  getGymSettings,
  getBusinessHours,
  getSubscriptionPlans,
  updateGymSettings,
  upsertBusinessHours,
} from '../../server/services/settings.service'

const mockPrisma = vi.mocked(prisma)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── getGymSettings() ─────────────────────────────────────────────────────────
describe('getGymSettings', () => {
  it('returns the first gym settings record', async () => {
    const settings = { id: '1', name: 'Gym XL', address: '12 rue A' }
    mockPrisma.gymSettings.findFirst.mockResolvedValue(settings as never)

    const result = await getGymSettings()

    expect(mockPrisma.gymSettings.findFirst).toHaveBeenCalledOnce()
    expect(result).toEqual(settings)
  })

  it('returns null when no settings have been saved', async () => {
    mockPrisma.gymSettings.findFirst.mockResolvedValue(null as never)

    const result = await getGymSettings()

    expect(result).toBeNull()
  })
})

// ─── getBusinessHours() ────────────────────────────────────────────────────────
describe('getBusinessHours', () => {
  it('returns business hours ordered by dayOfWeek', async () => {
    const hours = [
      { id: 'a', dayOfWeek: 'MONDAY', openTime: '08:00', closeTime: '18:00' },
      { id: 'b', dayOfWeek: 'TUESDAY', openTime: '08:00', closeTime: '18:00' },
    ]
    mockPrisma.businessHours.findMany.mockResolvedValue(hours as never)

    const result = await getBusinessHours()

    expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({ orderBy: { dayOfWeek: 'asc' } })
    expect(result).toHaveLength(2)
    expect(result[0].dayOfWeek).toBe('MONDAY')
  })
})

// ─── getSubscriptionPlans() ────────────────────────────────────────────────────
describe('getSubscriptionPlans', () => {
  it('returns all subscription plans ordered by createdAt', async () => {
    const plans = [
      { id: 'p1', label: 'Séance', price: 1500 },
      { id: 'p2', label: 'Carnet 10', price: 10000 },
    ]
    mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans as never)

    const result = await getSubscriptionPlans()

    expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no plans exist', async () => {
    mockPrisma.subscriptionPlan.findMany.mockResolvedValue([] as never)

    const result = await getSubscriptionPlans()

    expect(result).toEqual([])
  })
})

// ─── updateGymSettings() ──────────────────────────────────────────────────────
describe('updateGymSettings', () => {
  const UPDATE_DATA = { name: 'Nouveau Gym', address: '99 av B' }

  it('calls update when settings already exist', async () => {
    const existing = { id: 'existing-id', name: 'Old Gym' }
    const updated = { ...existing, ...UPDATE_DATA }
    mockPrisma.gymSettings.findFirst.mockResolvedValue(existing as never)
    mockPrisma.gymSettings.update.mockResolvedValue(updated as never)

    const result = await updateGymSettings(UPDATE_DATA)

    expect(mockPrisma.gymSettings.update).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: UPDATE_DATA,
    })
    expect(mockPrisma.gymSettings.create).not.toHaveBeenCalled()
    expect(result).toEqual(updated)
  })

  it('calls create when no settings exist yet', async () => {
    const created = { id: 'new-id', ...UPDATE_DATA }
    mockPrisma.gymSettings.findFirst.mockResolvedValue(null as never)
    mockPrisma.gymSettings.create.mockResolvedValue(created as never)

    const result = await updateGymSettings(UPDATE_DATA)

    expect(mockPrisma.gymSettings.create).toHaveBeenCalledWith({ data: UPDATE_DATA })
    expect(mockPrisma.gymSettings.update).not.toHaveBeenCalled()
    expect(result).toEqual(created)
  })
})

// ─── upsertBusinessHours() ────────────────────────────────────────────────────
describe('upsertBusinessHours', () => {
  const ENTRIES = [
    { dayOfWeek: 'MONDAY', openTime: '08:00', closeTime: '18:00' },
    { dayOfWeek: 'TUESDAY', openTime: '09:00', closeTime: '17:00', isHolidayOverride: true },
  ]

  it('calls upsert for each entry', async () => {
    mockPrisma.businessHours.upsert.mockResolvedValue({} as never)
    mockPrisma.businessHours.findMany.mockResolvedValue(ENTRIES as never)

    await upsertBusinessHours(ENTRIES)

    expect(mockPrisma.businessHours.upsert).toHaveBeenCalledTimes(2)
    expect(mockPrisma.businessHours.upsert).toHaveBeenCalledWith({
      where: { dayOfWeek: 'MONDAY' },
      update: { openTime: '08:00', closeTime: '18:00', isHolidayOverride: false },
      create: { dayOfWeek: 'MONDAY', openTime: '08:00', closeTime: '18:00', isHolidayOverride: false },
    })
  })

  it('coerces isHolidayOverride to boolean', async () => {
    mockPrisma.businessHours.upsert.mockResolvedValue({} as never)
    mockPrisma.businessHours.findMany.mockResolvedValue(ENTRIES as never)

    await upsertBusinessHours(ENTRIES)

    const secondCall = mockPrisma.businessHours.upsert.mock.calls[1][0]
    expect(secondCall.update.isHolidayOverride).toBe(true)
  })

  it('returns updated business hours after upsert', async () => {
    mockPrisma.businessHours.upsert.mockResolvedValue({} as never)
    mockPrisma.businessHours.findMany.mockResolvedValue(ENTRIES as never)

    const result = await upsertBusinessHours(ENTRIES)

    expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({ orderBy: { dayOfWeek: 'asc' } })
    expect(result).toEqual(ENTRIES)
  })

  it('handles empty entries array without calling upsert', async () => {
    mockPrisma.businessHours.findMany.mockResolvedValue([] as never)

    const result = await upsertBusinessHours([])

    expect(mockPrisma.businessHours.upsert).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})
