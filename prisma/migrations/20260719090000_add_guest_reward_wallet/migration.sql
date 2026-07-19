-- CreateEnum
CREATE TYPE "GuestRewardSessionStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GuestRewardEventStatus" AS ENUM ('EARNED', 'TRANSFERRED', 'REVERSED');

-- CreateEnum
CREATE TYPE "GuestRewardSource" AS ENUM ('RYO', 'TIKTOK_FOLLOW');

-- CreateEnum
CREATE TYPE "GuestRedemptionDraftStatus" AS ENUM ('PENDING_VERIFICATION', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('MASCOT_REDEMPTION');

-- DropIndex
DROP INDEX IF EXISTS "TikTokFollowReward_email_key";

-- DropForeignKey
ALTER TABLE "TikTokFollowReward" DROP CONSTRAINT "TikTokFollowReward_customerId_fkey";

-- AlterTable
ALTER TABLE "RyoClaim" ADD COLUMN "guestSessionId" TEXT;

-- AlterTable
ALTER TABLE "TikTokFollowReward"
ADD COLUMN "guestSessionId" TEXT,
ADD COLUMN "screenshotSha256" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GuestRewardSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "GuestRewardSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailHint" TEXT,
  "nameHint" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "convertedAt" TIMESTAMP(3),
  "convertedCustomerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestRewardSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestRewardEvent" (
  "id" TEXT NOT NULL,
  "source" "GuestRewardSource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "status" "GuestRewardEventStatus" NOT NULL DEFAULT 'EARNED',
  "note" TEXT,
  "guestSessionId" TEXT NOT NULL,
  "customerId" TEXT,
  "transferredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestRewardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestRedemptionDraft" (
  "id" TEXT NOT NULL,
  "status" "GuestRedemptionDraftStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "address1" TEXT NOT NULL,
  "address2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'US',
  "reservedUntil" TIMESTAMP(3) NOT NULL,
  "guestSessionId" TEXT NOT NULL,
  "mascotId" TEXT NOT NULL,
  "completedRedemptionId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestRedemptionDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
  "id" TEXT NOT NULL,
  "purpose" "EmailVerificationPurpose" NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "draftId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestRewardSession_tokenHash_key" ON "GuestRewardSession"("tokenHash");
CREATE INDEX "GuestRewardSession_status_expiresAt_idx" ON "GuestRewardSession"("status", "expiresAt");
CREATE INDEX "GuestRewardSession_convertedCustomerId_convertedAt_idx" ON "GuestRewardSession"("convertedCustomerId", "convertedAt");
CREATE UNIQUE INDEX "GuestRewardEvent_source_sourceId_key" ON "GuestRewardEvent"("source", "sourceId");
CREATE INDEX "GuestRewardEvent_guestSessionId_status_createdAt_idx" ON "GuestRewardEvent"("guestSessionId", "status", "createdAt");
CREATE INDEX "GuestRewardEvent_customerId_transferredAt_idx" ON "GuestRewardEvent"("customerId", "transferredAt");
CREATE UNIQUE INDEX "GuestRedemptionDraft_completedRedemptionId_key" ON "GuestRedemptionDraft"("completedRedemptionId");
CREATE INDEX "GuestRedemptionDraft_guestSessionId_status_createdAt_idx" ON "GuestRedemptionDraft"("guestSessionId", "status", "createdAt");
CREATE INDEX "GuestRedemptionDraft_email_status_createdAt_idx" ON "GuestRedemptionDraft"("email", "status", "createdAt");
CREATE INDEX "GuestRedemptionDraft_reservedUntil_idx" ON "GuestRedemptionDraft"("reservedUntil");
CREATE INDEX "EmailVerification_draftId_createdAt_idx" ON "EmailVerification"("draftId", "createdAt");
CREATE INDEX "EmailVerification_email_purpose_createdAt_idx" ON "EmailVerification"("email", "purpose", "createdAt");
CREATE INDEX "EmailVerification_expiresAt_idx" ON "EmailVerification"("expiresAt");
CREATE UNIQUE INDEX "TikTokFollowReward_screenshotSha256_key" ON "TikTokFollowReward"("screenshotSha256");
CREATE INDEX "RyoClaim_guestSessionId_createdAt_idx" ON "RyoClaim"("guestSessionId", "createdAt");
CREATE INDEX "TikTokFollowReward_guestSessionId_createdAt_idx" ON "TikTokFollowReward"("guestSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuestRewardSession" ADD CONSTRAINT "GuestRewardSession_convertedCustomerId_fkey" FOREIGN KEY ("convertedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuestRewardEvent" ADD CONSTRAINT "GuestRewardEvent_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestRewardSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRewardEvent" ADD CONSTRAINT "GuestRewardEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuestRedemptionDraft" ADD CONSTRAINT "GuestRedemptionDraft_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestRewardSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRedemptionDraft" ADD CONSTRAINT "GuestRedemptionDraft_mascotId_fkey" FOREIGN KEY ("mascotId") REFERENCES "MascotReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestRedemptionDraft" ADD CONSTRAINT "GuestRedemptionDraft_completedRedemptionId_fkey" FOREIGN KEY ("completedRedemptionId") REFERENCES "MascotRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "GuestRedemptionDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RyoClaim" ADD CONSTRAINT "RyoClaim_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestRewardSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TikTokFollowReward" ADD CONSTRAINT "TikTokFollowReward_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestRewardSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TikTokFollowReward" ADD CONSTRAINT "TikTokFollowReward_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
