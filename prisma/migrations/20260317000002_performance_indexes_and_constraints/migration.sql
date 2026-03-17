-- Migration: performance indexes + Message body length constraint

-- Subscription: compound index on (userId, status) for hasActiveSubscription() hot path
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- Subscription: index on (expiresAt, status) for cron expiry query
CREATE INDEX IF NOT EXISTS "Subscription_expiresAt_status_idx" ON "Subscription"("expiresAt", "status");

-- Message: index on (senderId, createdAt) for thread lookups by sender
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- Message: enforce maximum body length at the DB layer (mirrors frontend 2000-char limit)
ALTER TABLE "Message" ALTER COLUMN "body" TYPE VARCHAR(2000);
