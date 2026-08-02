-- CreateEnum
CREATE TYPE "RegisteredVia" AS ENUM ('WEB', 'MOBILE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phoneVerificationCodeCreatedAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerificationCodeHash" TEXT,
ADD COLUMN     "phoneVerificationLockedUntil" TIMESTAMP(3),
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registeredVia" "RegisteredVia" NOT NULL DEFAULT 'WEB';

