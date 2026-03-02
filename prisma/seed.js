const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()

  const cfgPath = path.join(__dirname, '..', 'server', 'config', 'business.config.json')
  if (!fs.existsSync(cfgPath)) {
    console.error('business.config.json not found at', cfgPath)
    process.exit(1)
  }

  const raw = fs.readFileSync(cfgPath, 'utf8')
  const cfg = JSON.parse(raw)

  // Seed SubscriptionPlans (upsert by name)
  const plans = cfg.subscriptionPlans || []
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: p.name },
      update: {
        planType: p.planType,
        priceSingle: p.priceSingle,
        priceCouple: p.priceCouple === null ? null : p.priceCouple,
        validityDays: p.validityDays,
        maxReports: p.maxReports,
        isActive: p.isActive,
      },
      create: {
        name: p.name,
        planType: p.planType,
        priceSingle: p.priceSingle,
        priceCouple: p.priceCouple === null ? null : p.priceCouple,
        validityDays: p.validityDays,
        maxReports: p.maxReports,
        isActive: p.isActive,
      },
    })
  }

  // Seed BusinessHours from openingHours
  const oh = cfg.openingHours || {}
  const bhEntries = []
  if (oh.mondayToFriday) {
    // Create entries for Monday-Friday
    const m = oh.mondayToFriday
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    for (const d of days) {
      bhEntries.push({
        dayOfWeek: d,
        openTime: m.open,
        closeTime: m.close,
        isHolidayOverride: false,
      })
    }
  }
  if (oh.saturday) {
    bhEntries.push({
      dayOfWeek: 'SATURDAY',
      openTime: oh.saturday.open,
      closeTime: oh.saturday.close,
      isHolidayOverride: false,
    })
  }
  if (oh.sundayAndHolidays) {
    bhEntries.push({
      dayOfWeek: 'SUNDAY',
      openTime: oh.sundayAndHolidays.open,
      closeTime: oh.sundayAndHolidays.close,
      isHolidayOverride: false,
    })
  }

  // Upsert business hours by dayOfWeek
  for (const e of bhEntries) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: e.dayOfWeek },
      update: {
        openTime: e.openTime,
        closeTime: e.closeTime,
        isHolidayOverride: e.isHolidayOverride,
      },
      create: {
        dayOfWeek: e.dayOfWeek,
        openTime: e.openTime,
        closeTime: e.closeTime,
        isHolidayOverride: e.isHolidayOverride,
      },
    })
  }

  // Seed GymSettings (single row) - upsert by id = 'default'
  const gym = cfg.location || {}
  const branding = cfg.branding || {}
  const settingsData = {
    id: 'default',
    name: cfg.gymIdentity?.name || 'Souplesse Fitness',
    slogan: cfg.gymIdentity?.slogan || '',
    primaryColor: Array.isArray(branding.primaryColors) ? branding.primaryColors[0] : null,
    secondaryColor: Array.isArray(branding.primaryColors) ? branding.primaryColors[1] : null,
    currency: cfg.gymIdentity?.currency || 'XOF',
    address: gym.address || '',
    phone: gym.phone || '',
    email: gym.email || '',
  }

  // Prisma model GymSettings uses id UUID; for simplicity we upsert by name if default id isn't UUID
  await prisma.gymSettings.upsert({
    where: { id: settingsData.id },
    update: {
      name: settingsData.name,
      slogan: settingsData.slogan,
      primaryColor: settingsData.primaryColor,
      secondaryColor: settingsData.secondaryColor,
      currency: settingsData.currency,
      address: settingsData.address,
      phone: settingsData.phone,
      email: settingsData.email,
    },
    create: {
      id: settingsData.id,
      name: settingsData.name,
      slogan: settingsData.slogan,
      primaryColor: settingsData.primaryColor,
      secondaryColor: settingsData.secondaryColor,
      currency: settingsData.currency,
      address: settingsData.address,
      phone: settingsData.phone,
      email: settingsData.email,
    },
  })

  // Seed demo accounts (dev / staging use)
  const DEMO_PASSWORD_HASH = await bcrypt.hash('Demo1234!', 12)
  const demoUsers = [
    { email: 'admin@demo.com',  name: 'Admin Demo',  role: 'ADMIN'  },
    { email: 'coach@demo.com',  name: 'Coach Demo',  role: 'COACH'  },
    { email: 'client@demo.com', name: 'Client Demo', role: 'CLIENT' },
  ]
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: DEMO_PASSWORD_HASH },
      create: { name: u.name, email: u.email, role: u.role, passwordHash: DEMO_PASSWORD_HASH },
    })
  }
  console.log('Demo accounts seeded: admin@demo.com | coach@demo.com | client@demo.com (password: Demo1234!)')

  // ── Demo data: sessions, bookings, program, subscription ─────────────────
  const coachUser  = await prisma.user.findUnique({ where: { email: 'coach@demo.com'  } })
  const clientUser = await prisma.user.findUnique({ where: { email: 'client@demo.com' } })

  if (coachUser && clientUser) {
    // 1. Coach-client assignment
    await prisma.coachClientAssignment.upsert({
      where: { coachId_clientId: { coachId: coachUser.id, clientId: clientUser.id } },
      update: {},
      create: { coachId: coachUser.id, clientId: clientUser.id },
    })

    // 2. Sessions (6 upcoming)
    const sessionDates = [
      new Date('2026-03-04T07:30:00Z'),
      new Date('2026-03-05T09:00:00Z'),
      new Date('2026-03-07T07:30:00Z'),
      new Date('2026-03-10T09:00:00Z'),
      new Date('2026-03-12T07:30:00Z'),
      new Date('2026-03-14T09:00:00Z'),
    ]
    const createdSessions = []
    for (const dateTime of sessionDates) {
      let s = await prisma.session.findFirst({ where: { coachId: coachUser.id, dateTime } })
      if (!s) {
        s = await prisma.session.create({
          data: { coachId: coachUser.id, dateTime, duration: 60, capacity: 10, location: 'Salle principale' },
        })
      }
      createdSessions.push(s)
    }

    // 3. Bookings: client confirmed in first 2 sessions
    for (const session of createdSessions.slice(0, 2)) {
      const existing = await prisma.booking.findFirst({ where: { sessionId: session.id, userId: clientUser.id } })
      if (!existing) {
        await prisma.booking.create({ data: { userId: clientUser.id, sessionId: session.id, status: 'CONFIRMED' } })
      }
    }

    // 4. Training program
    const existingProg = await prisma.program.findFirst({ where: { clientId: clientUser.id, coachId: coachUser.id } })
    if (!existingProg) {
      await prisma.program.create({
        data: {
          coachId: coachUser.id,
          clientId: clientUser.id,
          type: 'GAIN',
          content: {
            title: 'Programme Prise de Masse – Débutant',
            weeks: 8,
            sessionsPerWeek: 3,
            exercises: [
              { day: 'Lundi',    name: 'Squat',              sets: 4, reps: '8-10', rest: '90s'  },
              { day: 'Lundi',    name: 'Développé couché',   sets: 4, reps: '8-10', rest: '90s'  },
              { day: 'Mercredi', name: 'Soulevé de terre',   sets: 3, reps: '6-8',  rest: '120s' },
              { day: 'Mercredi', name: 'Rowing barre',       sets: 3, reps: '8-10', rest: '90s'  },
              { day: 'Vendredi', name: 'Tractions',          sets: 3, reps: '8-10', rest: '90s'  },
              { day: 'Vendredi', name: 'Presse à cuisses',   sets: 4, reps: '10-12', rest: '90s' },
            ],
            notes: "Focus sur la forme avant d'augmenter les charges. Progression de 2,5 kg par semaine si possible. Boire 2 L d'eau par jour.",
          },
        },
      })
    }

    // 5. Active subscription for client
    const plan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Abonnement 1 mois' } })
    if (plan) {
      const existingSub = await prisma.subscription.findFirst({ where: { userId: clientUser.id, status: 'ACTIVE' } })
      if (!existingSub) {
        const now     = new Date()
        const expires = new Date(now)
        expires.setDate(expires.getDate() + 25)
        await prisma.subscription.create({
          data: {
            userId:             clientUser.id,
            subscriptionPlanId: plan.id,
            type:               'MONTHLY',
            status:             'ACTIVE',
            isActive:           true,
            activationDate:     now,
            startsAt:           now,
            expiresAt:          expires,
            maxReports:         plan.maxReports,
          },
        })
      }
    }

    console.log('Demo data seeded: sessions, bookings, program, subscription for coach@demo.com / client@demo.com')
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.log('Seeding complete.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
