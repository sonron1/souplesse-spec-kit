const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()

  // ── 0. Clean all tables (dep order: leaves first) ─────────────────────────
  console.log('Cleaning database...')
  await prisma.message.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.systemLog.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.program.deleteMany()
  await prisma.coachClientAssignment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.paymentOrder.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.subscriptionPlan.deleteMany()
  await prisma.businessHours.deleteMany()
  await prisma.gymSettings.deleteMany()
  console.log('Database cleaned.')

  // ── 1. Subscription plans + Business config ────────────────────────────────
  const cfgPath = path.join(__dirname, '..', 'server', 'config', 'business.config.json')
  if (!fs.existsSync(cfgPath)) {
    console.error('business.config.json not found at', cfgPath)
    process.exit(1)
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))

  const plans = cfg.subscriptionPlans || []
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where:  { name: p.name },
      update: { planType: p.planType, priceSingle: p.priceSingle, priceCouple: p.priceCouple ?? null, validityDays: p.validityDays, maxReports: p.maxReports, maxPauses: p.maxPauses ?? 0, isActive: p.isActive },
      create: { name: p.name, planType: p.planType, priceSingle: p.priceSingle, priceCouple: p.priceCouple ?? null, validityDays: p.validityDays, maxReports: p.maxReports, maxPauses: p.maxPauses ?? 0, isActive: p.isActive },
    })
  }
  console.log(`${plans.length} subscription plans seeded.`)

  // Business hours
  const oh = cfg.openingHours || {}
  const bhEntries = []
  if (oh.mondayToFriday) {
    for (const d of ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']) {
      bhEntries.push({ dayOfWeek: d, openTime: oh.mondayToFriday.open, closeTime: oh.mondayToFriday.close, isHolidayOverride: false })
    }
  }
  if (oh.saturday)          bhEntries.push({ dayOfWeek: 'SATURDAY', openTime: oh.saturday.open,           closeTime: oh.saturday.close,           isHolidayOverride: false })
  if (oh.sundayAndHolidays) bhEntries.push({ dayOfWeek: 'SUNDAY',   openTime: oh.sundayAndHolidays.open, closeTime: oh.sundayAndHolidays.close, isHolidayOverride: false })
  for (const e of bhEntries) {
    await prisma.businessHours.upsert({
      where:  { dayOfWeek: e.dayOfWeek },
      update: { openTime: e.openTime, closeTime: e.closeTime, isHolidayOverride: e.isHolidayOverride },
      create: e,
    })
  }

  // Gym settings
  const gym = cfg.location || {}
  const branding = cfg.branding || {}
  await prisma.gymSettings.upsert({
    where:  { id: 'default' },
    update: { name: cfg.gymIdentity?.name || 'Souplesse Fitness', slogan: cfg.gymIdentity?.slogan || '', primaryColor: branding.primaryColors?.[0] ?? null, secondaryColor: branding.primaryColors?.[1] ?? null, currency: cfg.gymIdentity?.currency || 'XOF', address: gym.address || '', phone: gym.phone || '', email: gym.email || '' },
    create: { id: 'default', name: cfg.gymIdentity?.name || 'Souplesse Fitness', slogan: cfg.gymIdentity?.slogan || '', primaryColor: branding.primaryColors?.[0] ?? null, secondaryColor: branding.primaryColors?.[1] ?? null, currency: cfg.gymIdentity?.currency || 'XOF', address: gym.address || '', phone: gym.phone || '', email: gym.email || '' },
  })
  console.log('Business config seeded.')

  // ── 2. Users ────────────────────────────────────────────────────────────────
  const HASH = await bcrypt.hash('Demo1234!', 12)
  const now = new Date()
  const daysFromNow = (n) => { const dt = new Date(now); dt.setDate(dt.getDate() + n); return dt }
  const daysAgo     = (n) => { const dt = new Date(now); dt.setDate(dt.getDate() - n); return dt }

  // ── 2a. Admins (2) ──────────────────────────────────────────────────────────
  const adminRows = [
    { email: 'admin@souplesse.com',  name: 'Yaba Adodo',   firstName: 'Yaba',  lastName: 'Adodo',  phone: '+22997000001', gender: 'FEMALE', birthDay: 14, birthMonth: 3  },
    { email: 'admin2@souplesse.com', name: 'Kodjo Tossou', firstName: 'Kodjo', lastName: 'Tossou', phone: '+22997000002', gender: 'MALE',   birthDay: 22, birthMonth: 9  },
  ]
  const admins = []
  for (const u of adminRows) {
    admins.push(await prisma.user.create({ data: { ...u, role: 'ADMIN', passwordHash: HASH, emailVerified: true } }))
  }

  // ── 2b. Coaches (4) ─────────────────────────────────────────────────────────
  const coachRows = [
    { email: 'coach.serge@souplesse.com',   name: 'Serge Kouassi',   firstName: 'Serge',   lastName: 'Kouassi',   phone: '+22997000011', gender: 'MALE',   birthDay: 5,  birthMonth: 4  },
    { email: 'coach.adjoua@souplesse.com',  name: "Adjoua N'Dri",    firstName: 'Adjoua',  lastName: "N'Dri",     phone: '+22997000012', gender: 'FEMALE', birthDay: 22, birthMonth: 7  },
    { email: 'coach.ibrahim@souplesse.com', name: 'Ibrahim Mensah',  firstName: 'Ibrahim', lastName: 'Mensah',    phone: '+22997000013', gender: 'MALE',   birthDay: 18, birthMonth: 1  },
    { email: 'coach.divine@souplesse.com',  name: 'Divine Amoussou', firstName: 'Divine',  lastName: 'Amoussou',  phone: '+22997000014', gender: 'FEMALE', birthDay: 30, birthMonth: 11 },
  ]
  const coaches = []
  for (const u of coachRows) {
    coaches.push(await prisma.user.create({ data: { ...u, role: 'COACH', passwordHash: HASH, emailVerified: true } }))
  }
  const [c1, c2, c3, c4] = coaches

  // ── 2c. Clients (10) ────────────────────────────────────────────────────────
  const planMap = {}
  const allPlans = await prisma.subscriptionPlan.findMany()
  for (const p of allPlans) planMap[p.name] = p

  const clientRows = [
    { email: 'aminata.kone@souplesse.com',    name: 'Aminata Kone',      firstName: 'Aminata',  lastName: 'Kone',       phone: '+22996100001', gender: 'FEMALE', birthDay: 3,  birthMonth: 6,  coach: c1, subPlan: 'Abonnement 1 mois',  daysLeft: 18  },
    { email: 'koffi.mensah@souplesse.com',    name: 'Koffi Mensah',      firstName: 'Koffi',    lastName: 'Mensah',     phone: '+22996100002', gender: 'MALE',   birthDay: 17, birthMonth: 8,  coach: c1, subPlan: 'Carnet 10 seances',  daysLeft: 22  },
    { email: 'mariam.coulibaly@souplesse.com',name: 'Mariam Coulibaly',  firstName: 'Mariam',   lastName: 'Coulibaly',  phone: '+22996100003', gender: 'FEMALE', birthDay: 28, birthMonth: 4,  coach: c1, subPlan: 'Suivi personnel',     daysLeft: 2   },
    { email: 'fatoumata.diallo@souplesse.com',name: 'Fatoumata Diallo',  firstName: 'Fatoumata',lastName: 'Diallo',     phone: '+22996100004', gender: 'FEMALE', birthDay: 9,  birthMonth: 2,  coach: c2, subPlan: null,                  daysLeft: 0   },
    { email: 'oumar.traore@souplesse.com',    name: 'Oumar Traore',      firstName: 'Oumar',    lastName: 'Traore',     phone: '+22996100005', gender: 'MALE',   birthDay: 25, birthMonth: 5,  coach: c2, subPlan: 'Abonnement 3 mois',  daysLeft: 67  },
    { email: 'cedric.agossou@souplesse.com',  name: 'Cedric Agossou',    firstName: 'Cedric',   lastName: 'Agossou',    phone: '+22996100006', gender: 'MALE',   birthDay: 14, birthMonth: 1,  coach: c2, subPlan: 'Abonnement 1 an',    daysLeft: 310 },
    { email: 'blessing.okonkwo@souplesse.com',name: 'Blessing Okonkwo',  firstName: 'Blessing', lastName: 'Okonkwo',    phone: '+22996100007', gender: 'FEMALE', birthDay: 11, birthMonth: 10, coach: c3, subPlan: 'Carnet 15 seances',  daysLeft: 55  },
    { email: 'djibril.ndiaye@souplesse.com',  name: 'Djibril Ndiaye',    firstName: 'Djibril',  lastName: 'Ndiaye',     phone: '+22996100008', gender: 'MALE',   birthDay: 7,  birthMonth: 3,  coach: c3, subPlan: 'Abonnement 1 mois',  daysLeft: 10  },
    { email: 'aicha.sow@souplesse.com',       name: 'Aicha Sow',         firstName: 'Aicha',    lastName: 'Sow',        phone: '+22996100009', gender: 'FEMALE', birthDay: 19, birthMonth: 12, coach: c4, subPlan: null,                  daysLeft: 0   },
    { email: 'leonce.gnancadja@souplesse.com',name: 'Leonce Gnancadja',  firstName: 'Leonce',   lastName: 'Gnancadja',  phone: '+22996100010', gender: 'MALE',   birthDay: 2,  birthMonth: 7,  coach: c4, subPlan: 'Abonnement 6 mois',  daysLeft: 140 },
  ]

  const clients = []
  for (const row of clientRows) {
    const { coach, subPlan, daysLeft, ...userData } = row
    const rec = await prisma.user.create({ data: { ...userData, role: 'CLIENT', passwordHash: HASH, emailVerified: true } })
    clients.push({ rec, coach, subPlan, daysLeft })
  }
  const [aminata, koffi, mariam, fatoumata, oumar, cedric, blessing, djibril, aicha, leonce] = clients.map(c => c.rec)

  console.log(`Users seeded: ${admins.length} admins, ${coaches.length} coaches, ${clients.length} clients.`)

  // ── 3. Assignments ────────────────────────────────────────────────────────
  for (const { rec, coach } of clients) {
    if (coach) {
      await prisma.coachClientAssignment.create({
        data: { coachId: coach.id, clientId: rec.id, status: 'ACCEPTED', requestedBy: 'admin' },
      })
    }
  }
  console.log('Assignments created.')

  // ── 4. Subscriptions ──────────────────────────────────────────────────────
  for (const { rec, subPlan, daysLeft } of clients) {
    if (!subPlan) continue
    // Find plan by name (try exact, then normalized)
    const plan = planMap[subPlan] || Object.values(planMap).find(p => p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === subPlan)
    if (!plan) { console.warn(`Plan not found: ${subPlan}`); continue }
    const elapsed = plan.validityDays - daysLeft
    const start   = daysAgo(elapsed)
    const expires = daysFromNow(daysLeft)
    await prisma.subscription.create({
      data: { userId: rec.id, subscriptionPlanId: plan.id, type: 'MONTHLY', status: 'ACTIVE', isActive: true, activationDate: start, startsAt: start, expiresAt: expires, maxReports: plan.maxReports },
    })
  }
  console.log('Subscriptions created.')

  // ── 5. Sessions ───────────────────────────────────────────────────────────
  async function mkSessions(coach, pastDates, upcomingDates, location) {
    const all = []
    for (const dt of pastDates)     all.push({ s: await prisma.session.create({ data: { coachId: coach.id, dateTime: dt, duration: 60, capacity: 12, location } }), past: true  })
    for (const dt of upcomingDates) all.push({ s: await prisma.session.create({ data: { coachId: coach.id, dateTime: dt, duration: 60, capacity: 12, location } }), past: false })
    return all
  }

  const sc1 = await mkSessions(c1,
    [new Date('2026-01-08T07:30:00Z'), new Date('2026-01-20T09:00:00Z'), new Date('2026-02-03T07:30:00Z'), new Date('2026-02-17T09:00:00Z')],
    [new Date('2026-03-09T07:30:00Z'), new Date('2026-03-12T09:00:00Z'), new Date('2026-03-16T07:30:00Z'), new Date('2026-03-19T09:00:00Z')],
    'Salle principale'
  )
  const sc2 = await mkSessions(c2,
    [new Date('2026-01-12T10:00:00Z'), new Date('2026-02-05T10:00:00Z'), new Date('2026-02-19T10:00:00Z')],
    [new Date('2026-03-10T10:00:00Z'), new Date('2026-03-13T10:00:00Z'), new Date('2026-03-17T10:00:00Z')],
    'Salle 2'
  )
  const sc3 = await mkSessions(c3,
    [new Date('2026-01-15T08:00:00Z'), new Date('2026-02-12T08:00:00Z')],
    [new Date('2026-03-11T08:00:00Z'), new Date('2026-03-14T08:00:00Z'), new Date('2026-03-18T08:00:00Z')],
    'Plateau fitness'
  )
  const sc4 = await mkSessions(c4,
    [new Date('2026-01-22T17:00:00Z'), new Date('2026-02-26T17:00:00Z')],
    [new Date('2026-03-12T17:00:00Z'), new Date('2026-03-19T17:00:00Z')],
    'Salle cardio'
  )
  console.log('Sessions created.')

  // ── 6. Bookings ───────────────────────────────────────────────────────────
  async function book(clientRec, sessionList, count) {
    let done = 0
    for (const { s } of sessionList) {
      if (done >= count) break
      await prisma.booking.create({ data: { userId: clientRec.id, sessionId: s.id, status: 'CONFIRMED' } })
      done++
    }
  }

  await book(aminata,    sc1, 6)   // 4 past + 2 upcoming
  await book(koffi,      sc1, 3)
  await book(mariam,     sc1, 3)
  await book(fatoumata,  sc2, 4)
  await book(oumar,      sc2, 4)
  await book(cedric,     sc2, 3)
  await book(blessing,   sc3, 3)
  await book(djibril,    sc3, 4)
  await book(aicha,      sc4, 2)
  await book(leonce,     sc4, 3)
  console.log('Bookings created.')

  // ── 7. Programs ───────────────────────────────────────────────────────────
  await prisma.program.createMany({
    data: [
      {
        clientId: aminata.id, coachId: c1.id, type: 'FULL_BODY',
        content: { title: 'Programme Full Body - Debutant', weeks: 8, sessionsPerWeek: 3, exercises: [
          { day: 'Lundi', name: 'Squat', sets: 4, reps: '8-10', rest: '90s' },
          { day: 'Lundi', name: 'Developpe couche', sets: 3, reps: '10-12', rest: '60s' },
          { day: 'Mercredi', name: 'Souleve de terre', sets: 3, reps: '6-8', rest: '120s' },
          { day: 'Vendredi', name: 'Tractions', sets: 3, reps: '8-10', rest: '90s' },
        ], notes: "Focus sur la technique avant d'augmenter les charges." },
      },
      {
        clientId: oumar.id, coachId: c2.id, type: 'CARDIO',
        content: { title: 'Programme Cardio - Remise en forme', weeks: 6, sessionsPerWeek: 3, exercises: [
          { day: 'Lundi', name: 'Course 30 min', sets: 1, reps: '30 min', rest: 'N/A' },
          { day: 'Mercredi', name: 'Velo elliptique', sets: 1, reps: '25 min', rest: 'N/A' },
          { day: 'Vendredi', name: 'Corde a sauter', sets: 5, reps: '3 min', rest: '60s' },
        ], notes: "Maintenir frequence cardiaque entre 130-150 bpm." },
      },
      {
        clientId: blessing.id, coachId: c3.id, type: 'LOWER_BODY',
        content: { title: 'Programme Bas du Corps - Renforcement', weeks: 6, sessionsPerWeek: 2, exercises: [
          { day: 'Mardi', name: 'Fentes marchees', sets: 4, reps: '12 par jambe', rest: '60s' },
          { day: 'Mardi', name: 'Leg press', sets: 4, reps: '10-12', rest: '90s' },
          { day: 'Jeudi', name: 'Hip thrust', sets: 3, reps: '12-15', rest: '60s' },
        ], notes: "Controler la descente sur toutes les extensions." },
      },
      {
        clientId: leonce.id, coachId: c4.id, type: 'UPPER_BODY',
        content: { title: 'Programme Haut du Corps - Intermediaire', weeks: 10, sessionsPerWeek: 3, exercises: [
          { day: 'Lundi', name: 'Developpe militaire', sets: 4, reps: '8-10', rest: '90s' },
          { day: 'Lundi', name: 'Curl halteres', sets: 3, reps: '10-12', rest: '60s' },
          { day: 'Jeudi', name: 'Tirage horizontal', sets: 4, reps: '10-12', rest: '90s' },
        ], notes: "Epaule droite a surveiller — variante halteres si douleur." },
      },
    ],
  })
  console.log('Programs created.')

  // ── 8. Messages ───────────────────────────────────────────────────────────
  async function thread(coach, client, pairs) {
    for (const [role, body] of pairs) {
      const senderId    = role === 'coach' ? coach.id : client.id
      const recipientId = role === 'coach' ? client.id : coach.id
      await prisma.message.create({ data: { coachId: coach.id, clientId: client.id, senderId, recipientId, body } })
    }
  }

  await thread(c1, aminata, [
    ['client', 'Bonjour Coach Serge, est-ce que la seance de lundi est maintenue ?'],
    ['coach',  "Oui, rendez-vous a 7h30. N'oubliez pas vos chaussures de sport."],
    ['client', 'Parfait ! Question sur le squat : jusqu'+ "'" + 'ou je descends ?'],
    ['coach',  'Descendez jusqu\'a ce que vos cuisses soient paralleles au sol. Dos droit.'],
    ['client', 'Compris, merci ! A lundi !'],
  ])

  await thread(c1, koffi, [
    ['client', 'Bonjour Coach, mon carnet expire bientot. Comment je renouvelle ?'],
    ['coach',  'Bonjour Koffi ! Allez sur la page "S\'abonner" et choisissez votre formule.'],
    ['client', 'Super, je regarde ca ce soir. La prochaine seance c\'est quand ?'],
    ['coach',  'Jeudi 7h30 en salle principale. On travaille les jambes.'],
  ])

  await thread(c1, mariam, [
    ['client', 'Coach Serge, mon abonnement suivi personnel se termine dans 2 jours...'],
    ['coach',  'Oui Mariam, pensez a renouveler pour ne pas perdre votre suivi. Vous avez bien progresse !'],
    ['client', 'Je vais le faire aujourd\'hui. Merci pour tout ce travail !'],
    ['coach',  'Avec plaisir. Continuez comme ca, les resultats parlent d\'eux-memes.'],
  ])

  await thread(c2, fatoumata, [
    ['client', 'Bonjour Coach Adjoua, comment se passe le programme de cette semaine ?'],
    ['coach',  'Tout se deroule bien ! On continue le cardio mardi et jeudi.'],
    ['client', 'Parfait ! Je dois apporter quelque chose ?'],
    ['coach',  "Juste de l'eau et votre motivation. A mardi !"],
  ])

  await thread(c2, oumar, [
    ['client', "Coach Adjoua, j'ai du mal avec la course de 30 min, je m'essoufle vite."],
    ['coach',  'Normal au debut ! Commencez par 20 min et ajoutez 2 min chaque semaine.'],
    ['client', "D'accord, je vais suivre ce rythme. Merci pour le conseil."],
    ['coach',  'Et respirez par le nez a l\'inspiration, bouche a l\'expiration.'],
  ])

  await thread(c2, cedric, [
    ['client', 'Bonsoir Coach Adjoua, je voulais confirmer ma presence jeudi.'],
    ['coach',  'Bonsoir Cedric ! Vous etes attendu a 10h. On attaque le renfo muscu.'],
    ['client', "Parfait, je serai la. On fait quoi exactement ?"],
    ['coach',  'Circuit training : 5 exercices, 4 series chacun. Preparez-vous !'],
  ])

  await thread(c3, blessing, [
    ['client', 'Bonjour Coach Ibrahim, les fentes me font travailler les mollets, c\'est normal ?'],
    ['coach',  'Oui ! Les fentes travaillent quadriceps, ischio-jambiers et mollets.'],
    ['client', 'Super ! Quand peut-on ajouter du poids ?'],
    ['coach',  'Dans 2 semaines si votre technique est solide. On evalue ca a la prochaine seance.'],
  ])

  await thread(c3, djibril, [
    ['client', 'Coach, je peux venir a 2 seances cette semaine au lieu d\'une ?'],
    ['coach',  'Absolument Djibril ! Mercredi 8h et vendredi 8h. Vous etes motive j\'aime ca !'],
    ['client', "Super merci ! J'ai un mariage dans 2 mois, je veux etre au top."],
    ['coach',  'On va y arriver ! Gardez le meme niveau d\'implication.'],
  ])

  await thread(c4, aicha, [
    ['client', 'Bonjour Coach Divine, quelle formule vous recommandez pour commencer ?'],
    ['coach',  "Bonjour Aicha ! L'abonnement 1 mois est parfait. Essayez 2 seances par semaine."],
    ['client', "D'accord je vais m'inscrire ce soir. La salle cardio c'est au 1er etage ?"],
    ['coach',  "Oui, tout droit en sortant des vestiaires. On se retrouve jeudi 17h !"],
  ])

  await thread(c4, leonce, [
    ['client', 'Coach Divine, mon epaule droite est douloureuse apres le developpe militaire.'],
    ['coach',  'Leonce, stoppez cet exercice cette semaine. Je vous montre une variante jeudi.'],
    ['client', 'Merci pour la precaution. Je vais faire de la glace ce soir.'],
    ['coach',  '15 min de glace 3 fois par jour. Reposez-vous bien avant jeudi.'],
  ])

  console.log('Messages seeded.')

  // ── 9. Notifications ──────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: mariam.id,    type: 'SUBSCRIPTION_EXPIRING', title: 'Abonnement bientot expire', body: 'Votre abonnement "Suivi personnel" expire dans 2 jours. Pensez a le renouveler.' },
      { userId: admins[0].id, type: 'NEW_MEMBER',            title: 'Nouveau membre',             body: "Cedric Agossou vient de souscrire a l'abonnement 1 an." },
      { userId: admins[0].id, type: 'SUBSCRIPTION_EXPIRING', title: 'Rappel expiration',          body: 'Mariam Coulibaly : abonnement expire dans 2 jours.' },
      { userId: c1.id,        type: 'NEW_BOOKING',           title: 'Nouvelle reservation',       body: 'Aminata Kone a reserve votre seance du 12 mars.' },
      { userId: c3.id,        type: 'NEW_BOOKING',           title: 'Nouvelle reservation',       body: 'Djibril Ndiaye a reserve 2 seances cette semaine.' },
    ],
  })
  console.log('Notifications seeded.')

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n================================================================')
  console.log('  SEED COMPLETE  —  password for all accounts: Demo1234!')
  console.log('================================================================')
  console.log('\n  ADMINS (2)')
  console.log('    admin@souplesse.com       Yaba Adodo')
  console.log('    admin2@souplesse.com      Kodjo Tossou')
  console.log('\n  COACHES (4)')
  console.log('    coach.serge@souplesse.com    Serge Kouassi   (4 past + 4 upcoming sessions)')
  console.log('    coach.adjoua@souplesse.com   Adjoua N\'Dri     (3 past + 3 upcoming sessions)')
  console.log('    coach.ibrahim@souplesse.com  Ibrahim Mensah  (2 past + 3 upcoming sessions)')
  console.log('    coach.divine@souplesse.com   Divine Amoussou (2 past + 2 upcoming sessions)')
  console.log('\n  MEMBERS (10)')
  console.log('    aminata.kone@souplesse.com     Aminata Kone      Abo 1 mois     18j  coach Serge')
  console.log('    koffi.mensah@souplesse.com     Koffi Mensah       Carnet 10      22j  coach Serge')
  console.log('    mariam.coulibaly@souplesse.com Mariam Coulibaly  Suivi perso     2j  coach Serge  ⚠')
  console.log('    fatoumata.diallo@souplesse.com Fatoumata Diallo  Sans abo            coach Adjoua')
  console.log('    oumar.traore@souplesse.com     Oumar Traore      Abo 3 mois     67j  coach Adjoua')
  console.log('    cedric.agossou@souplesse.com   Cedric Agossou    Abo 1 an      310j  coach Adjoua')
  console.log('    blessing.okonkwo@souplesse.com Blessing Okonkwo  Carnet 15      55j  coach Ibrahim')
  console.log('    djibril.ndiaye@souplesse.com   Djibril Ndiaye    Abo 1 mois     10j  coach Ibrahim')
  console.log('    aicha.sow@souplesse.com        Aicha Sow          Sans abo            coach Divine')
  console.log('    leonce.gnancadja@souplesse.com Leonce Gnancadja  Abo 6 mois    140j  coach Divine')
  console.log('================================================================\n')

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
