-- Migration: add emailVerificationTokenCreatedAt to User
-- Enables 24-hour TTL enforcement on email verification tokens.

ALTER TABLE "User" ADD COLUMN "emailVerificationTokenCreatedAt" TIMESTAMP(3);
