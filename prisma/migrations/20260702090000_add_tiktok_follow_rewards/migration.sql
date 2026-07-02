CREATE TABLE "TikTokFollowReward" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "tiktokUsername" TEXT,
    "screenshotName" TEXT NOT NULL,
    "screenshotMimeType" TEXT NOT NULL,
    "screenshotBase64" TEXT NOT NULL,
    "screenshotBytes" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 500,
    "rewardGranted" BOOLEAN NOT NULL DEFAULT true,
    "rewardGrantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokFollowReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TikTokFollowReward_email_key" ON "TikTokFollowReward"("email");
CREATE INDEX "TikTokFollowReward_customerId_createdAt_idx" ON "TikTokFollowReward"("customerId", "createdAt");
CREATE INDEX "TikTokFollowReward_rewardGranted_createdAt_idx" ON "TikTokFollowReward"("rewardGranted", "createdAt");

ALTER TABLE "TikTokFollowReward"
ADD CONSTRAINT "TikTokFollowReward_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
