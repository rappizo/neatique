import type Stripe from "stripe";
import type { CartLine } from "@/lib/cart";
import type { CheckoutAddress, CheckoutDraft } from "@/lib/checkout-draft";

type CheckoutMetadataRecord = Record<string, string>;

export type CheckoutCartMetadataItem = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  pointsReward: number;
};

export function serializeCheckoutAddress(prefix: string, address: CheckoutAddress): CheckoutMetadataRecord {
  return {
    [`${prefix}Name`]: address.fullName,
    [`${prefix}Address1`]: address.address1,
    [`${prefix}Address2`]: address.address2 || "",
    [`${prefix}City`]: address.city,
    [`${prefix}State`]: address.state,
    [`${prefix}PostalCode`]: address.postalCode,
    [`${prefix}Country`]: address.country
  };
}

export function buildCheckoutSessionMetadata(input: {
  cart: {
    lines: CartLine[];
    appliedCoupons: Array<{ id: string; code: string }>;
    appliedCouponCodes: string[];
    discountCents: number;
  };
  draft: CheckoutDraft;
}) {
  const cartMetadata = input.cart.lines
    .map((line) =>
      [
        line.product.id,
        line.quantity,
        line.product.priceCents,
        line.product.pointsReward
      ].join(":")
    )
    .join(",");

  return {
    customerId: "",
    cartItems: cartMetadata,
    couponIds: input.cart.appliedCoupons.map((coupon) => coupon.id).join(","),
    couponCodes: input.cart.appliedCouponCodes.join(","),
    discountCents: String(input.cart.discountCents),
    contactFirstName: input.draft.firstName.trim() || "",
    contactLastName: input.draft.lastName.trim() || "",
    ...serializeCheckoutAddress("shipping", input.draft.shippingAddress!),
    ...serializeCheckoutAddress("billing", input.draft.billingAddress!),
    billingSameAsShipping: input.draft.billingSameAsShipping ? "true" : "false"
  } satisfies CheckoutMetadataRecord;
}

export function parseCheckoutCartMetadataItems(
  metadata: Stripe.Metadata | Record<string, string | undefined> | null | undefined
) {
  return (metadata?.cartItems || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [productId, quantity, unitPriceCents, pointsReward] = item.split(":");

      return {
        productId,
        quantity: Math.max(1, Number(quantity || 1)),
        unitPriceCents: Math.max(0, Number(unitPriceCents || 0) || 0),
        pointsReward: Math.max(0, Number(pointsReward || 0) || 0)
      } satisfies CheckoutCartMetadataItem;
    })
    .filter((item) => item.productId);
}

export function readAddressFromCheckoutMetadata(
  metadata: Stripe.Metadata | Record<string, string | undefined> | null | undefined,
  prefix: "shipping" | "billing"
) {
  return {
    name: metadata?.[`${prefix}Name`] || null,
    line1: metadata?.[`${prefix}Address1`] || null,
    line2: metadata?.[`${prefix}Address2`] || null,
    city: metadata?.[`${prefix}City`] || null,
    state: metadata?.[`${prefix}State`] || null,
    postalCode: metadata?.[`${prefix}PostalCode`] || null,
    country: metadata?.[`${prefix}Country`] || null
  };
}
