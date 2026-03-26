import { NextResponse } from "next/server";
import { getCartDetails } from "@/lib/cart";
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
  const baseUrl = getBaseUrl();
  let { lines } = await getCartDetails();

  if (lines.length === 0 && productId) {
    const product = await getProductById(productId);

    if (product) {
      lines = [
        {
          product,
          quantity,
          lineTotalCents: product.priceCents * quantity
        }
      ];
    }
  }

  if (lines.length === 0 || !email) {
    return NextResponse.redirect(new URL("/cart?error=empty-cart", baseUrl), 303);
  }

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
    return NextResponse.redirect(new URL("/cart", baseUrl), 303);
  }

  const cartMetadata = lines.map((line) => `${line.product.id}:${line.quantity}`).join(",");
  const lineItems = lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: line.product.currency.toLowerCase(),
      unit_amount: line.product.priceCents,
      product_data: {
        name: line.product.name,
        description: line.product.shortDescription
      }
    }
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    billing_address_collection: "required",
    customer_creation: "always",
    allow_promotion_codes: true,
    shipping_address_collection: {
      allowed_countries: ["US"]
    },
    metadata: {
      customerId: customer.id,
      cartItems: cartMetadata
    },
    customer_email: email,
    line_items: lineItems,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cart`
  });

  return NextResponse.redirect(session.url || `${baseUrl}/cart`, 303);
}
