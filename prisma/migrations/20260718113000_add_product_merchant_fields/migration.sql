ALTER TABLE "Product"
ADD COLUMN "gtin" TEXT,
ADD COLUMN "mpn" TEXT,
ADD COLUMN "identifierExists" BOOLEAN,
ADD COLUMN "netContent" TEXT,
ADD COLUMN "ingredients" TEXT,
ADD COLUMN "directions" TEXT,
ADD COLUMN "warnings" TEXT,
ADD COLUMN "countryOfOrigin" TEXT,
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "priceValidUntil" TIMESTAMP(3);
