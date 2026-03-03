/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `CoachClientAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropConstraint (Postgres requires DROP CONSTRAINT, not DROP INDEX for unique constraints)
ALTER TABLE "CoachClientAssignment" DROP CONSTRAINT "CoachClientAssignment_coachId_clientId_key";

-- AlterTable
ALTER TABLE "CoachClientAssignment" ADD COLUMN     "requestedBy" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CoachClientAssignment_clientId_key" ON "CoachClientAssignment"("clientId");

-- CreateIndex
CREATE INDEX "CoachClientAssignment_status_idx" ON "CoachClientAssignment"("status");

-- CreateIndex
CREATE INDEX "Message_coachId_createdAt_idx" ON "Message"("coachId", "createdAt");
