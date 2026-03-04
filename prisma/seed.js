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
    { email: 'admin@demo.com',   name: 'Admin Demo',       role: 'ADMIN'  },
    { email: 'coach@demo.com',   name: 'Coach Serge',      role: 'COACH'  },
    { email: 'coach2@demo.com',  name: 'Coach Adjoua',     role: 'COACH'  },
    { email: 'client@demo.com',  name: 'Client Demo',      role: 'CLIENT' },
  ]
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: DEMO_PASSWORD_HASH, emailVerified: true },
      create: { name: u.name, email: u.email, role: u.role, passwordHash: DEMO_PASSWORD_HASH, emailVerified: true },
    })
  }
  console.log('Demo accounts seeded: admin@demo.com | coach@demo.com | coach2@demo.com | client@demo.com (password: Demo1234!)')

  // ── Demo data: sessions, bookings, program, subscription ─────────────────
  const coachUser  = await prisma.user.findUnique({ where: { email: 'coach@demo.com'  } })
  const coach2User  = await prisma.user.findUnique({ where: { email: 'coach2@demo.com' } })
  const clientUser = await prisma.user.findUnique({ where: { email: 'client@demo.com' } })

  if (coachUser && clientUser) {
    // 1. Coach-client assignment
    await prisma.coachClientAssignment.upsert({
      where: { clientId: clientUser.id },
      update: { coachId: coachUser.id, status: 'ACCEPTED' },
      create: { coachId: coachUser.id, clientId: clientUser.id, status: 'ACCEPTED', requestedBy: 'admin' },
    })

    // 2. Sessions: 6 PAST + 6 upcoming
    const pastSessionDates = [
      new Date('2026-01-06T07:30:00Z'),
      new Date('2026-01-09T09:00:00Z'),
      new Date('2026-01-13T07:30:00Z'),
      new Date('2026-02-03T07:30:00Z'),
      new Date('2026-02-10T09:00:00Z'),
      new Date('2026-02-24T07:30:00Z'),
    ]
    const upcomingSessionDates = [
      new Date('2026-03-05T09:00:00Z'),
      new Date('2026-03-07T07:30:00Z'),
      new Date('2026-03-10T09:00:00Z'),
      new Date('2026-03-12T07:30:00Z'),
      new Date('2026-03-14T09:00:00Z'),
      new Date('2026-03-17T07:30:00Z'),
    ]
    const sessionDates = [...pastSessionDates, ...upcomingSessionDates]
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

    // 3. Bookings: client confirmed in past sessions + first 2 upcoming
    for (const session of [...createdSessions.slice(0, 6), ...createdSessions.slice(6, 8)]) {
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

    // --- Messages between coach1 and client (for monitor) ---
    const msgPairs = [
      { coachId: coachUser.id, clientId: clientUser.id, senderId: clientUser.id, recipientId: coachUser.id,  body: 'Bonjour Coach, je voulais savoir si la seance de mardi est maintenue ?' },
      { coachId: coachUser.id, clientId: clientUser.id, senderId: coachUser.id,  recipientId: clientUser.id, body: 'Oui bien sur ! Soyez la a 7h30. N oubliez pas vos chaussures de sport.' },
      { coachId: coachUser.id, clientId: clientUser.id, senderId: clientUser.id, recipientId: coachUser.id,  body: 'Super merci ! J ai une question sur mon programme, semaine 3 je dois faire combien de series au squat ?' },
      { coachId: coachUser.id, clientId: clientUser.id, senderId: coachUser.id,  recipientId: clientUser.id, body: '4 series de 8-10 repetitions. Commencez leger pour vous echauffer puis montez progressivement.' },
      { coachId: coachUser.id, clientId: clientUser.id, senderId: clientUser.id, recipientId: coachUser.id,  body: 'Compris, je ferai ca. A mardi !' },
    ]
    for (const msg of msgPairs) {
      const already = await prisma.message.findFirst({ where: { coachId: msg.coachId, clientId: msg.clientId, body: msg.body } })
      if (!already) {
        await prisma.message.create({
          data: { coachId: msg.coachId, clientId: msg.clientId, senderId: msg.senderId, recipientId: msg.recipientId, body: msg.body }
        })
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Extra fake clients (5 more for realistic demo) ────────────────────────
  const extraClients = [
    { email: 'aminata.kone@test.com',       name: 'Aminata Koné',       subPlan: 'Abonnement 1 mois',   bookSessions: 2, assignToCoach: true  },
    { email: 'koffi.mensah@test.com',        name: 'Koffi Mensah',        subPlan: 'Carnet 10 séances',  bookSessions: 1, assignToCoach: false },
    { email: 'fatoumata.diallo@test.com',    name: 'Fatoumata Diallo',    subPlan: null,                  bookSessions: 0, assignToCoach: false },
    { email: 'oumar.traore@test.com',        name: 'Oumar Traoré',        subPlan: 'Abonnement 3 mois',  bookSessions: 1, assignToCoach: false },
    { email: 'blessing.okonkwo@test.com',    name: 'Blessing Okonkwo',    subPlan: 'Carnet 15 séances',  bookSessions: 2, assignToCoach: false },
  ]

  const EXTRA_PASSWORD_HASH = await bcrypt.hash('Demo1234!', 12)
  const coachForExtras = await prisma.user.findUnique({ where: { email: 'coach@demo.com' } })
  const coach2ForExtras = await prisma.user.findUnique({ where: { email: 'coach2@demo.com' } })

  // --- Coach2 gets sessions + 2 clients + messages for monitor diversity ---
  if (coach2ForExtras) {
    const coach2SessionDates = [
      new Date('2026-01-15T10:00:00Z'),
      new Date('2026-02-05T10:00:00Z'),
      new Date('2026-03-06T10:00:00Z'),
      new Date('2026-03-09T10:00:00Z'),
    ]
    const c2Sessions = []
    for (const dateTime of coach2SessionDates) {
      let s = await prisma.session.findFirst({ where: { coachId: coach2ForExtras.id, dateTime } })
      if (!s) s = await prisma.session.create({ data: { coachId: coach2ForExtras.id, dateTime, duration: 60, capacity: 8, location: 'Salle 2' } })
      c2Sessions.push(s)
    }
    console.log('Coach2 sessions seeded')
  }

  for (const ec of extraClients) {
    // Upsert client user
    const clientRec = await prisma.user.upsert({
      where:  { email: ec.email },
      update: { name: ec.name, emailVerified: true },
      create: { name: ec.name, email: ec.email, role: 'CLIENT', passwordHash: EXTRA_PASSWORD_HASH, emailVerified: true },
    })

    // Assign to coach (coach1 for assignToCoach=true, else none)
    const assignCoach = ec.assignToCoach ? (coachForExtras ?? null) : null
    if (assignCoach) {
      await prisma.coachClientAssignment.upsert({
        where: { clientId: clientRec.id },
        update: { coachId: assignCoach.id, status: 'ACCEPTED' },
        create: { coachId: assignCoach.id, clientId: clientRec.id, status: 'ACCEPTED', requestedBy: 'admin' },
      })
      // Demo messages for monitor
      const threadMsgs = [
        { senderId: clientRec.id, recipientId: assignCoach.id, body: `Bonjour ${assignCoach.name}, je suis ${ec.name}. Quand commence notre prochaine seance ?` },
        { senderId: assignCoach.id, recipientId: clientRec.id, body: `Bonjour ${ec.name} ! Votre prochaine seance est planifiee la semaine prochaine.` },
      ]
      for (const msg of threadMsgs) {
        const already = await prisma.message.findFirst({ where: { coachId: assignCoach.id, clientId: clientRec.id, body: msg.body } })
        if (!already) {
          await prisma.message.create({ data: { coachId: assignCoach.id, clientId: clientRec.id, senderId: msg.senderId, recipientId: msg.recipientId, body: msg.body } })
        }
      }
    }

    // Create subscription
    if (ec.subPlan) {
      const subPlanRec = await prisma.subscriptionPlan.findFirst({ where: { name: ec.subPlan } })
      if (subPlanRec) {
        const existingSub = await prisma.subscription.findFirst({ where: { userId: clientRec.id, status: 'ACTIVE' } })
        if (!existingSub) {
          const start = new Date()
          const end   = new Date(start)
          end.setDate(end.getDate() + subPlanRec.validityDays)
          await prisma.subscription.create({
            data: {
              userId:             clientRec.id,
              subscriptionPlanId: subPlanRec.id,
              type:               'MONTHLY',
              status:             'ACTIVE',
              isActive:           true,
              activationDate:     start,
              startsAt:           start,
              expiresAt:          end,
              maxReports:         subPlanRec.maxReports,
            },
          })
        }
      }
    }

    // Book sessions (reuse coach sessions already created)
    if (ec.bookSessions > 0 && coachForExtras) {
      const coachSessions = await prisma.session.findMany({
        where: { coachId: coachForExtras.id },
        orderBy: { dateTime: 'asc' },
        take: ec.bookSessions + 2,
      })
      let booked = 0
      for (const sess of coachSessions) {
        if (booked >= ec.bookSessions) break
        const already = await prisma.booking.findFirst({ where: { sessionId: sess.id, userId: clientRec.id } })
        if (!already) {
          await prisma.booking.create({ data: { userId: clientRec.id, sessionId: sess.id, status: 'CONFIRMED' } })
          booked++
        }
      }
    }
  }

  console.log('Extra fake clients seeded: Aminata, Koffi, Fatoumata, Oumar, Blessing (password: Demo1234!)')

  // Assign Fatoumata to coach2 and seed a thread for monitor
  if (coach2ForExtras) {
    const fatoumata = await prisma.user.findUnique({ where: { email: 'fatoumata.diallo@test.com' } })
    if (fatoumata) {
      await prisma.coachClientAssignment.upsert({
        where:  { clientId: fatoumata.id },
        update: { coachId: coach2ForExtras.id, status: 'ACCEPTED' },
        create: { coachId: coach2ForExtras.id, clientId: fatoumata.id, status: 'ACCEPTED', requestedBy: 'admin' },
      })
      const c2Msgs = [
        { senderId: fatoumata.id,       recipientId: coach2ForExtras.id, body: 'Bonjour Coach Adjoua, comment se passe le programme de cette semaine ?' },
        { senderId: coach2ForExtras.id, recipientId: fatoumata.id,       body: 'Tout se passe bien ! On continue le travail cardio mardi et jeudi.' },
        { senderId: fatoumata.id,       recipientId: coach2ForExtras.id, body: 'Parfait, je serai la ! Dois-je apporter quoi que ce soit ?' },
        { senderId: coach2ForExtras.id, recipientId: fatoumata.id,       body: 'Juste de l eau et votre enthousiasme. A mardi !' },
      ]
      for (const msg of c2Msgs) {
        const already = await prisma.message.findFirst({ where: { coachId: coach2ForExtras.id, clientId: fatoumata.id, body: msg.body } })
        if (!already) {
          await prisma.message.create({ data: { coachId: coach2ForExtras.id, clientId: fatoumata.id, senderId: msg.senderId, recipientId: msg.recipientId, body: msg.body } })
        }
      }
      console.log('Coach2 (Adjoua) client assignment + messages seeded')
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.log('Seeding complete.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
