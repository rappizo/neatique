import { NextResponse } from "next/server";
import { getCartDetails } from "@/lib/cart";
import {
  buildDiscountedStripeLineItems,
} from "@/lib/coupons";
import { createCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { getProductById } from "@/lib/queries";
import { getBaseUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const productId = String(formData.get("productId") || "");
  const quantity = Math.max(1, Math.min(10, Number(formData.get("quantity") || 1)));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") || "").trim() || null;
  const lastName = String(formData.get("lastName") || "").trim() || null;
  const baseUrl = getBaseUrl(request);
  let { lines, appliedCoupons, appliedCouponCodes, discountCents } = await getCartDetails();

  if (lines.length === 0 && productId) {
    const product = await getProductById(productId);

    if (product) {
      lines = [
        {
          product,
          quantity,
          lineTotalCents: product.priceCents * quantity,
          originalLineTotalCents: product.priceCents * quantity,
          discountCents: 0
        }
      ];
      appliedCoupons = [];
      appliedCouponCodes = [];
      discountCents = 0;
    }
  }

  if (lines.length === 0 || !email) {
    return NextResponse.redirect(new URL("/cart?error=empty-cart", baseUrl), 303);
  }
  const { lineItems } = buildDiscountedStripeLineItems(lines, appliedCoupons);

  let customer = await prisma.customer.findUnique({
    where: { email }
  });

  let generatedPassword: string | null = null;

  if (!customer) {
    generatedPassword = generateTemporaryPassword();
    customer = await prisma.customer.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash: hashPassword(generatedPassword),
        passwordSetAt: new Date()
      }
    });

    await createCustomerSession(customer.id);
  } else if (!customer.passwordHash) {
    generatedPassword = generateTemporaryPassword();
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: customer.firstName || firstName,
        lastName: customer.lastName || lastName,
        passwordHash: hashPassword(generatedPassword),
        passwordSetAt: new Date()
      }
    });
  }

  if (generatedPassword) {
    try {
      await sendCustomerWelcomeEmail({
        email,
        firstName: customer.firstName,
        password: generatedPassword
      });
    } catch (error) {
      console.error("Welcome email delivery failed:", error);
    }
  }

  if (!stripe) {
    console.error("Stripe checkout is unavailable because STRIPE_SECRET_KEY is missing or invalid.");
    return NextResponse.redirect(new URL("/cart?error=stripe-config", baseUrl), 303);
  }

  const cartMetadata = lines.map((line) => `${line.product.id}:${line.quantity}`).join(",");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "required",
      customer_creation: "always",
      allow_promotion_codes: false,
      shipping_address_collection: {
        allowed_countries: ["US"]
      },
      metadata: {
        customerId: customer.id,
        cartItems: cartMetadata,
        couponIds: appliedCoupons.map((coupon) => coupon.id).join(","),
        couponCodes: appliedCouponCodes.join(","),
        discountCents: String(discountCents)
      },
      customer_email: email,
      line_items: lineItems,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`
    });

    if (!session.url) {
      console.error("Stripe checkout session created without a redirect URL.", {
        sessionId: session.id
      });
      return NextResponse.redirect(new URL("/cart?error=stripe-checkout", baseUrl), 303);
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return NextResponse.redirect(new URL("/cart?error=stripe-checkout", baseUrl), 303);
  }
}
