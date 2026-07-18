-- AlterTable
ALTER TABLE "ProductReview"
ADD COLUMN "purchaseChannel" TEXT,
ADD COLUMN "reviewImageUrl" TEXT,
ADD COLUMN "hasRating" BOOLEAN NOT NULL DEFAULT true;
