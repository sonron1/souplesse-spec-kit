-- Add maxPauses to Subscription so it can be incremented independently of the plan
-- on each cumulative renewal. Backfill from the linked plan; default to 0 when no plan.

ALTER TABLE "Subscription" ADD COLUMN "maxPauses" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows from their plan
UPDATE "Subscription" s
SET "maxPauses" = sp."maxPauses"
FROM "SubscriptionPlan" sp
WHERE s."subscriptionPlanId" = sp.id;
