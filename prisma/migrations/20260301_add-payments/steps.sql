-- Migration: add payments (PaymentOrder, Transaction)
-- Generated: 2026-03-01

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PaymentOrder table
CREATE TABLE IF NOT EXISTS "PaymentOrder" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "subscriptionPlanId" uuid NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  "kkiapayOrderToken" text UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Transaction table
CREATE TABLE IF NOT EXISTS "Transaction" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "paymentOrderId" uuid NOT NULL REFERENCES "PaymentOrder"(id) ON DELETE CASCADE,
  "paymentId" text UNIQUE NOT NULL,
  "eventType" text NOT NULL,
  status text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  "rawPayload" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
