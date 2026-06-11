CREATE TABLE "OrderShipment" (
    "id" TEXT NOT NULL,
    "shippingCarrier" "ShippingCarrier" NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OrderShipment" (
    "id",
    "shippingCarrier",
    "trackingNumber",
    "sortOrder",
    "orderId",
    "createdAt",
    "updatedAt"
)
SELECT
    'ship_' || substr(md5(o."id" || shipment."trackingNumber" || shipment."sortOrder"::text), 1, 24),
    o."shippingCarrier",
    shipment."trackingNumber",
    shipment."sortOrder",
    o."id",
    COALESCE(o."updatedAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "Order" o
CROSS JOIN LATERAL (
    SELECT
        btrim(split.value) AS "trackingNumber",
        (split.ordinality - 1)::int AS "sortOrder"
    FROM regexp_split_to_table(replace(o."trackingNumber", E'\r', E'\n'), E'\n|,')
        WITH ORDINALITY AS split(value, ordinality)
) shipment
WHERE o."shippingCarrier" IS NOT NULL
  AND o."trackingNumber" IS NOT NULL
  AND shipment."trackingNumber" <> '';

CREATE INDEX "OrderShipment_orderId_sortOrder_idx" ON "OrderShipment"("orderId", "sortOrder");
CREATE INDEX "OrderShipment_shippingCarrier_idx" ON "OrderShipment"("shippingCarrier");

ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
