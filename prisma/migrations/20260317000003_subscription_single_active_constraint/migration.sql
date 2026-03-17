-- Migration: enforce single-active subscription invariant at the DB level
--
-- Adds a partial unique index on Subscription("userId") WHERE "isActive" = true.
-- This guarantees that no user can ever have more than one active subscription,
-- even under concurrent writes or application-level bugs.
--
-- A standard @@unique would block multiple EXPIRED rows per user (isActive=false),
-- so we use a PostgreSQL partial index instead — Prisma doesn't support these
-- natively in schema.prisma, so this migration must be kept in sync manually.
--
-- If a second ACTIVE row is inserted for the same userId, the DB raises:
--   PrismaClientKnownRequestError P2002 (unique constraint violation)

CREATE UNIQUE INDEX "Subscription_userId_isActive_unique"
  ON "Subscription" ("userId")
  WHERE "isActive" = true;
