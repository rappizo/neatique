import assert from "node:assert/strict";
import test from "node:test";
import { buildCheckoutSessionMetadata, parseCheckoutCartMetadataItems, readAddressFromCheckoutMetadata } from "../lib/checkout-metadata";
import type { CheckoutDraft } from "../lib/checkout-draft";
import type { CartLine } from "../lib/cart";

const draft: CheckoutDraft = {
  email: "customer@example.com",
  firstName: "Ava",
  lastName: "Miller",
  billingSameAsShipping: false,
  shippingAddress: {
    fullName: "Ava Miller",
    address1: "100 Main St",
    address2: "Unit 2",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
    country: "US"
  },
  billingAddress: {
    fullName: "Ava Miller",
    address1: "200 Billing Ave",
    address2: "",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90002",
    country: "US"
  }
};

const lines: CartLine[] = [
  {
    product: {
      id: "prod_1",
      productCode: "0001",
      productShortName: "PDRN Cream",
      amazonAsin: null,
      name: "PDRN Cream",
      slug: "pdrn-cream",
      tagline: "Tag",
      category: "Cream",
      shortDescription: "Desc",
      description: "Desc",
      details: "Details",
      imageUrl: "/product-1.webp",
      galleryImages: [],
      featured: true,
      status: "ACTIVE",
      inventory: 30,
      priceCents: 2999,
      compareAtPriceCents: 3999,
      currency: "USD",
      pointsReward: 42,
      stripePriceId: null,
      reviewCount: 0,
      averageRating: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    },
    quantity: 2,
    lineTotalCents: 5998,
    originalLineTotalCents: 5998,
    discountCents: 0
  }
];

test("checkout metadata preserves price snapshots and addresses", () => {
  const metadata = buildCheckoutSessionMetadata({
    cart: {
      lines,
      appliedCoupons: [{ id: "coupon_1", code: "SAVE10" }],
      appliedCouponCodes: ["SAVE10"],
      discountCents: 600
    },
    draft
  });

  assert.equal(metadata.cartItems, "prod_1:2:2999:42");
  assert.equal(metadata.couponIds, "coupon_1");
  assert.equal(metadata.couponCodes, "SAVE10");
  assert.equal(metadata.discountCents, "600");

  assert.deepEqual(parseCheckoutCartMetadataItems(metadata), [
    {
      productId: "prod_1",
      quantity: 2,
      unitPriceCents: 2999,
      pointsReward: 42
    }
  ]);

  assert.deepEqual(readAddressFromCheckoutMetadata(metadata, "shipping"), {
    name: "Ava Miller",
    line1: "100 Main St",
    line2: "Unit 2",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
    country: "US"
  });
});
