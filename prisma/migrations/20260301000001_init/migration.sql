-- Prisma initial migration
-- Covers ALL models in schema.prisma
-- Generated: 2026-03-01

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('CLIENT','COACH','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionType" AS ENUM ('MONTHLY','QUARTERLY','ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING','ACTIVE','EXPIRED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','CONFIRMED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED','CANCELLED','ATTENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProgramType" AS ENUM ('GAIN','LOSS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('MONTHLY','QUARTERLY','ANNUAL','COUPLE_MONTHLY','COUPLE_QUARTERLY','COUPLE_ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- User
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role"         "UserRole" NOT NULL DEFAULT 'CLIENT',
  "refreshToken" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- ---------------------------------------------------------------------------
-- GymSettings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "GymSettings" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"           TEXT NOT NULL,
  "slogan"         TEXT,
  "primaryColor"   TEXT,
  "secondaryColor" TEXT,
  "currency"       TEXT NOT NULL,
  "address"        TEXT,
  "phone"          TEXT,
  "email"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- BusinessHours
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "BusinessHours" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dayOfWeek"         "DayOfWeek" NOT NULL UNIQUE,
  "openTime"          TEXT NOT NULL,
  "closeTime"         TEXT NOT NULL,
  "isHolidayOverride" BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------------
-- SubscriptionPlan
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "planType"     "PlanType" NOT NULL,
  "priceSingle"  INTEGER NOT NULL,
  "priceCouple"  INTEGER,
  "validityDays" INTEGER NOT NULL,
  "maxReports"   INTEGER NOT NULL,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Subscription
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"             TEXT NOT NULL REFERENCES "User"("id"),
  "subscriptionPlanId" TEXT REFERENCES "SubscriptionPlan"("id"),
  "type"               "SubscriptionType" NOT NULL DEFAULT 'MONTHLY',
  "status"             "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "activationDate"     TIMESTAMPTZ,
  "startsAt"           TIMESTAMPTZ,
  "expiresAt"          TIMESTAMPTZ,
  "maxReports"         INTEGER,
  "partnerUserId"      TEXT,
  "isActive"           BOOLEAN NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");

-- ---------------------------------------------------------------------------
-- Payment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Payment" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"               TEXT NOT NULL REFERENCES "User"("id"),
  "subscriptionId"       TEXT REFERENCES "Subscription"("id"),
  "amount"               INTEGER NOT NULL,
  "currency"             TEXT NOT NULL DEFAULT 'XOF',
  "provider"             TEXT NOT NULL DEFAULT 'kkiapay',
  "kkiapayTransactionId" TEXT UNIQUE,
  "status"               "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

-- ---------------------------------------------------------------------------
-- PaymentOrder (legacy Kkiapay model)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "PaymentOrder" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"             TEXT NOT NULL,
  "subscriptionPlanId" TEXT NOT NULL,
  "amount"             INTEGER NOT NULL,
  "currency"           TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'pending',
  "kkiapayOrderToken"  TEXT UNIQUE,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Transaction (legacy Kkiapay model)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "paymentOrderId" TEXT NOT NULL REFERENCES "PaymentOrder"("id") ON DELETE CASCADE,
  "paymentId"      TEXT NOT NULL UNIQUE,
  "eventType"      TEXT NOT NULL,
  "status"         TEXT NOT NULL,
  "amount"         INTEGER NOT NULL,
  "currency"       TEXT NOT NULL,
  "rawPayload"     JSONB NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Session
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Session" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "coachId"   TEXT NOT NULL REFERENCES "User"("id"),
  "dateTime"  TIMESTAMPTZ NOT NULL,
  "duration"  INTEGER NOT NULL,
  "capacity"  INTEGER NOT NULL,
  "location"  TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Session_coachId_idx" ON "Session"("coachId");
CREATE INDEX IF NOT EXISTS "Session_dateTime_idx" ON "Session"("dateTime");

-- ---------------------------------------------------------------------------
-- Booking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Booking" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES "User"("id"),
  "sessionId" TEXT NOT NULL REFERENCES "Session"("id"),
  "status"    "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Booking_userId_sessionId_key" UNIQUE ("userId", "sessionId")
);

CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX IF NOT EXISTS "Booking_sessionId_idx" ON "Booking"("sessionId");

-- ---------------------------------------------------------------------------
-- Program
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Program" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clientId"  TEXT NOT NULL REFERENCES "User"("id"),
  "coachId"   TEXT NOT NULL REFERENCES "User"("id"),
  "type"      "ProgramType" NOT NULL DEFAULT 'GAIN',
  "content"   JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Program_clientId_idx" ON "Program"("clientId");
CREATE INDEX IF NOT EXISTS "Program_coachId_idx" ON "Program"("coachId");

-- ---------------------------------------------------------------------------
-- CoachClientAssignment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CoachClientAssignment" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "coachId"    TEXT NOT NULL REFERENCES "User"("id"),
  "clientId"   TEXT NOT NULL REFERENCES "User"("id"),
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CoachClientAssignment_coachId_clientId_key" UNIQUE ("coachId", "clientId")
);

CREATE INDEX IF NOT EXISTS "CoachClientAssignment_coachId_idx" ON "CoachClientAssignment"("coachId");
CREATE INDEX IF NOT EXISTS "CoachClientAssignment_clientId_idx" ON "CoachClientAssignment"("clientId");
