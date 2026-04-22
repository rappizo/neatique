CREATE TABLE "OrderActivityLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderActivityLog_orderId_createdAt_idx" ON "OrderActivityLog"("orderId", "createdAt");
CREATE INDEX "OrderActivityLog_eventType_createdAt_idx" ON "OrderActivityLog"("eventType", "createdAt");

ALTER TABLE "OrderActivityLog" ADD CONSTRAINT "OrderActivityLog_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
