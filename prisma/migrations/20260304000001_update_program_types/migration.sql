-- Migration: Replace ProgramType enum (GAIN|LOSS → CARDIO|FULL_BODY|ABDO|UPPER_BODY|LOWER_BODY)
-- Also enforce one program per client via UNIQUE on clientId

-- 1. Create new enum first
CREATE TYPE "ProgramType_new" AS ENUM ('CARDIO', 'FULL_BODY', 'ABDO', 'UPPER_BODY', 'LOWER_BODY');

-- 2. Drop the default (it depends on old enum type) BEFORE altering the column
ALTER TABLE "Program" ALTER COLUMN "type" DROP DEFAULT;

-- 3. Cast column to TEXT to remove the enum type dependency
ALTER TABLE "Program" ALTER COLUMN "type" TYPE TEXT;

-- 4. Drop old enum (no dependencies remain)
DROP TYPE "ProgramType";

-- 5. Convert existing data while column is TEXT (no enum restriction)
UPDATE "Program" SET "type" = 'FULL_BODY' WHERE "type" = 'GAIN';
UPDATE "Program" SET "type" = 'CARDIO'    WHERE "type" = 'LOSS';

-- 6. Rename new enum into place
ALTER TYPE "ProgramType_new" RENAME TO "ProgramType";

-- 7. Cast column back to the new enum
ALTER TABLE "Program"
  ALTER COLUMN "type" TYPE "ProgramType"
  USING "type"::"ProgramType";

-- 8. Restore the column default with new enum type
ALTER TABLE "Program"
  ALTER COLUMN "type" SET DEFAULT 'FULL_BODY'::"ProgramType";

-- 9. Drop old non-unique index on clientId (replaced by unique constraint below)
DROP INDEX IF EXISTS "Program_clientId_idx";

-- 10. Add unique constraint: one program per client
ALTER TABLE "Program" ADD CONSTRAINT "Program_clientId_key" UNIQUE ("clientId");


