-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "reviewToken" TEXT,
ADD COLUMN "reviewTokenCreatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_reviewToken_key" ON "Order"("reviewToken");

-- Each purchased product can receive one review through a given order.
CREATE UNIQUE INDEX "ProductReview_orderId_productId_key"
ON "ProductReview"("orderId", "productId");
