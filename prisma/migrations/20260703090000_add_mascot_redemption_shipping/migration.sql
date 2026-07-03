ALTER TABLE "MascotRedemption"
ADD COLUMN IF NOT EXISTS "shippingCarrier" "ShippingCarrier",
ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT,
ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "MascotRedemptionEmailLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL,
    "deliveryProvider" TEXT,
    "deliveryMessageId" TEXT,
    "errorReason" TEXT,
    "redemptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MascotRedemptionEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MascotRedemption_shippingCarrier_idx" ON "MascotRedemption"("shippingCarrier");
CREATE INDEX IF NOT EXISTS "MascotRedemptionEmailLog_redemptionId_createdAt_idx" ON "MascotRedemptionEmailLog"("redemptionId", "createdAt");
CREATE INDEX IF NOT EXISTS "MascotRedemptionEmailLog_eventType_createdAt_idx" ON "MascotRedemptionEmailLog"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "MascotRedemptionEmailLog_recipientEmail_createdAt_idx" ON "MascotRedemptionEmailLog"("recipientEmail", "createdAt");

DO $$
BEGIN
  ALTER TABLE "MascotRedemptionEmailLog"
  ADD CONSTRAINT "MascotRedemptionEmailLog_redemptionId_fkey"
  FOREIGN KEY ("redemptionId") REFERENCES "MascotRedemption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
