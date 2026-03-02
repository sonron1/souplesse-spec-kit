-- Migration: add Subscription table
-- Generated: 2026-03-01

CREATE TABLE IF NOT EXISTS "Subscription" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "subscriptionPlanId" uuid NOT NULL,
  "startsAt" timestamptz NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
