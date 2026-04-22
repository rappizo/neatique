import { type CheckoutDraft } from "@/lib/checkout-draft";
import { buildCheckoutSessionMetadata } from "@/lib/checkout-metadata";
import { getBaseUrl, stripe } from "@/lib/stripe";
import type { CartLine } from "@/lib/cart";
import { buildDiscountedStripeLineItems } from "@/lib/coupons";

export type CheckoutSessionInput = {
  request?: Request;
  cart: {
    lines: CartLine[];
    appliedCoupons: Array<{
      id: string;
      code: string;
      content: string;
      active: boolean;
      combinable: boolean;
      appliesToAll: boolean;
      productCodes: string[];
      discountType: "PERCENT" | "FIXED_AMOUNT";
      percentOff: number | null;
      amountOffCents: number | null;
      usageMode: "SINGLE_USE" | "UNLIMITED";
      usageCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    appliedCouponCodes: string[];
    discountCents: number;
  };
  draft: CheckoutDraft;
};

export async function createStripeCheckoutSession({ request, cart, draft }: CheckoutSessionInput) {
  if (!stripe) {
    throw new Error("stripe-config");
  }

  const unavailableLine = cart.lines.find(
    (line) => line.product.inventory <= 0 || line.quantity > line.product.inventory
  );

  if (unavailableLine) {
    throw new Error("inventory-unavailable");
  }

  const { lineItems } = buildDiscountedStripeLineItems(cart.lines, cart.appliedCoupons);

  if (lineItems.length === 0) {
    throw new Error("coupon-over-discount");
  }

  const baseUrl = getBaseUrl(request);
  const email = draft.email.trim().toLowerCase();
  const firstName = draft.firstName.trim() || null;
  const lastName = draft.lastName.trim() || null;

  const metadata = buildCheckoutSessionMetadata({ cart, draft });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    allow_promotion_codes: false,
    customer_creation: "always",
    customer_email: email,
    billing_address_collection: "auto",
    metadata,
    line_items: lineItems,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/confirmation?status=canceled`
  });

  if (!session.url) {
    throw new Error("stripe-checkout");
  }

  return session;
}
