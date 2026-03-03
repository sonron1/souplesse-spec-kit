-- Migration: 20260303080000_add_security_and_couple
-- Adds account lockout fields (T0217), email verification fields (T0218),
-- and couple subscription partner linkage (FR-016).

-- AlterTable User — security fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginAttempts"          INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil"            TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified"          BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;

-- Unique index for emailVerificationToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerificationToken_key"
  ON "User"("emailVerificationToken");

-- AlterTable PaymentOrder — partner for couple plans (FR-016)
ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "partnerUserId" TEXT;
