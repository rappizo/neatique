import { NextResponse } from "next/server";
import { getCartDetails } from "@/lib/cart";
import { createStripeCheckoutSession } from "@/lib/checkout-session";
import { getCheckoutDraft } from "@/lib/checkout-draft";

export const runtime = "nodejs";

function redirectToConfirmation(request: Request, error?: string) {
  const url = new URL("/checkout/confirmation", request.url);

  if (error) {
    url.searchParams.set("error", error);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const [cart, draft] = await Promise.all([getCartDetails(), getCheckoutDraft()]);

  if (cart.lines.length === 0) {
    return NextResponse.redirect(new URL("/cart?error=empty-cart", request.url), 303);
  }

  if (
    !draft?.email ||
    !draft.firstName ||
    !draft.lastName ||
    !draft.shippingAddress ||
    !draft.billingAddress
  ) {
    return redirectToConfirmation(request, "address-missing");
  }

  try {
    const session = await createStripeCheckoutSession({
      request,
      cart,
      draft
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (error) {
    console.error("Checkout API session creation failed:", error);
    const message = error instanceof Error ? error.message : "stripe-checkout";

    if (message === "stripe-config") {
      return redirectToConfirmation(request, "stripe-config");
    }

    if (message === "coupon-over-discount") {
      return redirectToConfirmation(request, "coupon-over-discount");
    }

    return redirectToConfirmation(request, "stripe-checkout");
  }
}
