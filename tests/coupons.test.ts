import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscountedStripeLineItems, couponsCanBeCombined } from "../lib/coupons";

const sampleLines = [
  {
    product: {
      id: "prod_1",
      name: "PDRN Cream",
      shortDescription: "Silky cream",
      currency: "USD",
      priceCents: 3000,
      productCode: "0001"
    },
    quantity: 2,
    lineTotalCents: 6000
  },
  {
    product: {
      id: "prod_2",
      name: "Snail Serum",
      shortDescription: "Light serum",
      currency: "USD",
      priceCents: 2000,
      productCode: "0002"
    },
    quantity: 1,
    lineTotalCents: 2000
  }
];

test("coupon application builds valid discounted stripe line items", () => {
  const result = buildDiscountedStripeLineItems(sampleLines, [
    {
      code: "SAVE10",
      discountType: "PERCENT",
      percentOff: 10,
      amountOffCents: null,
      appliesToAll: true,
      productCodes: [],
      combinable: true
    }
  ]);

  assert.equal(result.discountCents, 800);
  assert.deepEqual(result.appliedCouponCodes, ["SAVE10"]);
  assert.equal(result.lineItems.length > 0, true);
  assert.equal(result.hasNonPositiveUnitAmount, false);
});

test("standalone coupons cannot be combined", () => {
  assert.equal(couponsCanBeCombined([{ combinable: false }, { combinable: true }]), false);
  assert.equal(couponsCanBeCombined([{ combinable: true }, { combinable: true }]), true);
});
