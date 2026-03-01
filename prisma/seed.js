const fs = require('fs');
const path = require('path');
const { PrismaClient, DayOfWeek } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const cfgPath = path.join(__dirname, '..', 'server', 'config', 'business.config.json');
  if (!fs.existsSync(cfgPath)) {
    console.error('business.config.json not found at', cfgPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(raw);

  // Seed SubscriptionPlans (upsert by name)
  const plans = cfg.subscriptionPlans || [];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: p.name },
      update: {
        priceSingle: p.priceSingle,
        priceCouple: p.priceCouple === null ? null : p.priceCouple,
        validityDays: p.validityDays,
        maxReports: p.maxReports,
        isActive: p.isActive,
      },
      create: {
        name: p.name,
        priceSingle: p.priceSingle,
        priceCouple: p.priceCouple === null ? null : p.priceCouple,
        validityDays: p.validityDays,
        maxReports: p.maxReports,
        isActive: p.isActive,
      }
    });
  }

  // Seed BusinessHours from openingHours
  const oh = cfg.openingHours || {};
  const bhEntries = [];
  if (oh.mondayToFriday) {
    // Create entries for Monday-Friday
    const m = oh.mondayToFriday;
    const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];
    for (const d of days) {
      bhEntries.push({ dayOfWeek: d, openTime: m.open, closeTime: m.close, isHolidayOverride: false });
    }
  }
  if (oh.saturday) {
    bhEntries.push({ dayOfWeek: 'SATURDAY', openTime: oh.saturday.open, closeTime: oh.saturday.close, isHolidayOverride: false });
  }
  if (oh.sundayAndHolidays) {
    bhEntries.push({ dayOfWeek: 'SUNDAY', openTime: oh.sundayAndHolidays.open, closeTime: oh.sundayAndHolidays.close, isHolidayOverride: false });
  }

  // Upsert business hours by dayOfWeek
  for (const e of bhEntries) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: e.dayOfWeek },
      update: { openTime: e.openTime, closeTime: e.closeTime, isHolidayOverride: e.isHolidayOverride },
      create: { dayOfWeek: e.dayOfWeek, openTime: e.openTime, closeTime: e.closeTime, isHolidayOverride: e.isHolidayOverride }
    });
  }

  // Seed GymSettings (single row) - upsert by id = 'default'
  const gym = cfg.location || {};
  const branding = cfg.branding || {};
  const settingsData = {
    id: 'default',
    name: cfg.gymIdentity?.name || 'Souplesse Fitness',
    slogan: cfg.gymIdentity?.slogan || '',
    primaryColor: Array.isArray(branding.primaryColors) ? branding.primaryColors[0] : null,
    secondaryColor: Array.isArray(branding.primaryColors) ? branding.primaryColors[1] : null,
    currency: cfg.gymIdentity?.currency || 'XOF',
    address: gym.address || '',
    phone: gym.phone || '',
    email: gym.email || ''
  };

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
      email: settingsData.email
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
      email: settingsData.email
    }
  });

  console.log('Seeding complete.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
