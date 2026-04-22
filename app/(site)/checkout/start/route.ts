import { NextResponse } from "next/server";
import { getCartDetails } from "@/lib/cart";
import { createStripeCheckoutSession } from "@/lib/checkout-session";
import { type CheckoutDraft, setCheckoutDraft } from "@/lib/checkout-draft";
import { buildCheckoutAddress, validateCheckoutAddress } from "@/lib/us-address";

export const runtime = "nodejs";

function redirectToConfirmation(request: Request, error?: string, status?: string) {
  const url = new URL("/checkout/confirmation", request.url);

  if (error) {
    url.searchParams.set("error", error);
  }

  if (status) {
    url.searchParams.set("status", status);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const billingSameAsShipping = formData.get("billingSameAsShipping") === "on";
  const cart = await getCartDetails();

  if (cart.lines.length === 0 || !email || !firstName || !lastName) {
    return redirectToConfirmation(request, "address-missing");
  }

  const shippingAddress = buildCheckoutAddress({
    fullName: formData.get("shippingFullName"),
    address1: formData.get("shippingAddress1"),
    address2: formData.get("shippingAddress2"),
    city: formData.get("shippingCity"),
    state: formData.get("shippingState"),
    postalCode: formData.get("shippingPostalCode")
  });
  const shippingValidation = validateCheckoutAddress(shippingAddress);

  if (shippingValidation) {
    return redirectToConfirmation(request, `address-${shippingValidation}`);
  }

  const rawBillingAddress = billingSameAsShipping
    ? shippingAddress
    : buildCheckoutAddress({
        fullName: formData.get("billingFullName"),
        address1: formData.get("billingAddress1"),
        address2: formData.get("billingAddress2"),
        city: formData.get("billingCity"),
        state: formData.get("billingState"),
        postalCode: formData.get("billingPostalCode")
      });
  const billingValidation = validateCheckoutAddress(rawBillingAddress);

  if (billingValidation) {
    return redirectToConfirmation(request, `address-${billingValidation}`);
  }

  const draft: CheckoutDraft = {
    email,
    firstName,
    lastName,
    shippingAddress,
    billingAddress: rawBillingAddress,
    billingSameAsShipping
  };

  await setCheckoutDraft(draft);

  try {
    const session = await createStripeCheckoutSession({
      request,
      cart,
      draft
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    const message = error instanceof Error ? error.message : "stripe-checkout";
    if (message === "stripe-config") {
      return redirectToConfirmation(request, "stripe-config");
    }

    if (message === "coupon-over-discount") {
      return redirectToConfirmation(request, "coupon-over-discount");
    }

    if (message === "inventory-unavailable") {
      return redirectToConfirmation(request, "inventory-unavailable");
    }

    return redirectToConfirmation(request, "stripe-checkout");
  }
}
