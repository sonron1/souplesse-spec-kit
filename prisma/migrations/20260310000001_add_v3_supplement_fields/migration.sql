-- Migration: 20260310000001_add_v3_supplement_fields
-- Adds all v3 supplement fields across User, Subscription, SubscriptionPlan and Message.

-- Gender enum
DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable User — extended profile fields (A001-A008)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName"           TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName"            TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone"               TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender"              "Gender";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthDay"            INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthMonth"          INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl"           TEXT;

-- Session token fields (C001)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionToken"           TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionTokenIssuedAt"   TIMESTAMP(3);

-- Unique indexes on phone and sessionToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key"         ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_sessionToken_key"  ON "User"("sessionToken");

-- AlterTable SubscriptionPlan — maxPauses (F002)
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxPauses" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Subscription — pause fields (J001) + reminder (I003)
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pauseCount"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pausedAt"      TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pausedUntil"   TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

-- AlterTable Message — editedAt (P001)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
