CREATE TYPE "ShippingCarrier" AS ENUM ('USPS', 'UPS_GROUND', 'DHL');

ALTER TABLE "Order"
ADD COLUMN "shippingCarrier" "ShippingCarrier",
ADD COLUMN "trackingNumber" TEXT;
