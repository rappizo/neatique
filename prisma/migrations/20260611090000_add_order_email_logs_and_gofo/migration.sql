ALTER TYPE "ShippingCarrier" ADD VALUE 'GOFO';

CREATE TABLE "OrderEmailLog" (
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
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderEmailLog_orderId_createdAt_idx" ON "OrderEmailLog"("orderId", "createdAt");
CREATE INDEX "OrderEmailLog_eventType_createdAt_idx" ON "OrderEmailLog"("eventType", "createdAt");
CREATE INDEX "OrderEmailLog_recipientEmail_createdAt_idx" ON "OrderEmailLog"("recipientEmail", "createdAt");

ALTER TABLE "OrderEmailLog" ADD CONSTRAINT "OrderEmailLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
