import { z } from 'zod'

export const PlanTypeSchema = z.enum([
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'COUPLE_MONTHLY',
  'COUPLE_QUARTERLY',
  'COUPLE_ANNUAL',
])

export type PlanType = z.infer<typeof PlanTypeSchema>

export const OpeningPeriodSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide (HH:mm)'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide (HH:mm)'),
})

export const OpeningHoursSchema = z.object({
  mondayToFriday: OpeningPeriodSchema,
  saturday: OpeningPeriodSchema,
  sundayAndHolidays: OpeningPeriodSchema,
})

export const SubscriptionPlanSchema = z.object({
  name: z.string(),
  planType: PlanTypeSchema,
  priceSingle: z.number().int(),
  priceCouple: z.number().int().nullable(),
  validityDays: z.number().int(),
  maxReports: z.number().int(),
  isActive: z.boolean(),
})

export const GymSettingsSchema = z.object({
  name: z.string(),
  slogan: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
  secondaryColor: z.string().nullable().optional(),
  currency: z.string(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

export const BusinessConfigSchema = z.object({
  gymIdentity: z.object({
    name: z.string(),
    slogan: z.string().optional(),
    currency: z.string(),
  }),
  openingHours: OpeningHoursSchema,
  subscriptionPlans: z.array(SubscriptionPlanSchema),
  dressCode: z.array(z.string()),
  location: z
    .object({
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  branding: z
    .object({
      primaryColors: z.array(z.string()).optional(),
      theme: z.string().optional(),
      style: z.string().optional(),
    })
    .optional(),
  rules: z
    .object({
      calculateValidityFromActivationDate: z.boolean().optional(),
      maxReportsEnforced: z.boolean().optional(),
      priceCoupleNullable: z.boolean().optional(),
      bookingOutsideOpeningHoursRejected: z.boolean().optional(),
    })
    .optional(),
  adminEditable: z.record(z.boolean()).optional(),
})
