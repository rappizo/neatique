import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import {
  parseCheckoutCartMetadataItems,
  readAddressFromCheckoutMetadata
} from "@/lib/checkout-metadata";
import { prisma } from "@/lib/db";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function createOrderNumber() {
  return `NEA-${Date.now().toString().slice(-8)}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function splitCustomerName(name: string | null | undefined) {
  if (!name) {
    return { firstName: null, lastName: null };
  }

  const [firstName, ...rest] = name.trim().split(" ");
  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null
  };
}

async function handleCompletedCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const checkoutId = session.id;

  const existingOrder = await prisma.order.findFirst({
    where: { stripeCheckoutId: checkoutId }
  });

  if (existingOrder) {
    return;
  }

  const metadataCustomerId = session.metadata?.customerId;
  const metadataCouponIds = (session.metadata?.couponIds || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const metadataCouponCodes = (session.metadata?.couponCodes || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const metadataDiscountCents = Math.max(
    0,
    Number.parseInt(session.metadata?.discountCents || "0", 10) || 0
  );
  const cartItems = parseCheckoutCartMetadataItems(session.metadata);

  if (cartItems.length === 0) {
    return;
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: cartItems.map((item) => item.productId)
      }
    }
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const resolvedLines = cartItems
    .map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents || product.priceCents,
        pointsReward: item.pointsReward || product.pointsReward,
        lineTotalCents: (item.unitPriceCents || product.priceCents) * item.quantity
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (resolvedLines.length === 0) {
    return;
  }

  const customerEmail = session.customer_details?.email || session.customer_email;

  if (!customerEmail) {
    return;
  }

  const shippingAddress = readAddressFromCheckoutMetadata(session.metadata, "shipping");
  const billingAddress = readAddressFromCheckoutMetadata(session.metadata, "billing");
  const customerName = shippingAddress.name || session.customer_details?.name;
  const nameParts = splitCustomerName(customerName);
  const originalSubtotalCents = resolvedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const totalCents =
    session.amount_total ?? Math.max(0, originalSubtotalCents - metadataDiscountCents);
  const subtotalCents = originalSubtotalCents;
  const shippingCents = 0;
  const taxCents = session.total_details?.amount_tax ?? 0;
  const pointsEarned = resolvedLines.reduce(
    (sum, line) => sum + line.pointsReward * line.quantity,
    0
  );
  let welcomePayload: { email: string; firstName: string | null; password: string } | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const duplicateOrder = await tx.order.findFirst({
        where: { stripeCheckoutId: checkoutId }
      });

      if (duplicateOrder) {
        return;
      }

      const existingCustomer = metadataCustomerId
        ? await tx.customer.findUnique({
            where: { id: metadataCustomerId }
          })
        : await tx.customer.findUnique({
            where: { email: customerEmail }
          });

      let welcomePassword: string | null = null;
      let customer = existingCustomer
        ? await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              firstName: existingCustomer.firstName || nameParts.firstName,
              lastName: existingCustomer.lastName || nameParts.lastName,
              totalSpentCents: {
                increment: totalCents
              },
              loyaltyPoints: {
                increment: pointsEarned
              }
            }
          })
        : await tx.customer.create({
            data: {
              email: customerEmail,
              firstName: nameParts.firstName,
              lastName: nameParts.lastName,
              passwordHash: hashPassword((welcomePassword = generateTemporaryPassword())),
              passwordSetAt: new Date(),
              totalSpentCents: totalCents,
              loyaltyPoints: pointsEarned,
              marketingOptIn: false
            }
          });

      if (!customer.passwordHash) {
        welcomePassword = generateTemporaryPassword();
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            passwordHash: hashPassword(welcomePassword),
            passwordSetAt: new Date()
          }
        });
      }

      const appliedCoupons = metadataCouponIds.length
        ? await tx.coupon.findMany({
            where: {
              id: {
                in: metadataCouponIds
              }
            },
            select: {
              id: true
            }
          })
        : [];

      let orderNumber = createOrderNumber();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const existingOrderNumber = await tx.order.findUnique({
          where: { orderNumber }
        });

        if (!existingOrderNumber) {
          break;
        }

        orderNumber = createOrderNumber();
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          email: customerEmail,
          status: "PAID",
          fulfillmentStatus: "UNFULFILLED",
          currency: (session.currency || "usd").toUpperCase(),
          subtotalCents,
          discountCents: metadataDiscountCents,
          shippingCents,
          taxCents,
          totalCents,
          pointsEarned,
          couponCode: metadataCouponCodes.join(", ") || null,
          couponId: appliedCoupons.length === 1 ? appliedCoupons[0].id : null,
          stripeCheckoutId: checkoutId,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          shippingName: customerName || null,
          shippingAddress1: shippingAddress.line1,
          shippingAddress2: shippingAddress.line2,
          shippingCity: shippingAddress.city,
          shippingState: shippingAddress.state,
          shippingPostalCode: shippingAddress.postalCode,
          shippingCountry: shippingAddress.country,
          billingName: billingAddress.name,
          billingAddress1: billingAddress.line1,
          billingAddress2: billingAddress.line2,
          billingCity: billingAddress.city,
          billingState: billingAddress.state,
          billingPostalCode: billingAddress.postalCode,
          billingCountry: billingAddress.country,
          customerId: customer.id,
          items: {
            create: resolvedLines.map((line) => ({
              productId: line.product.id,
              name: line.product.name,
              slug: line.product.slug,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              lineTotalCents: line.lineTotalCents,
              imageUrl: line.product.imageUrl
            }))
          }
        }
      });

      if (pointsEarned > 0) {
        await tx.rewardEntry.create({
          data: {
            customerId: customer.id,
            orderId: order.id,
            type: "EARNED",
            points: pointsEarned,
            note: `Paid order ${order.orderNumber}`
          }
        });
      }

      for (const line of resolvedLines) {
        await tx.$executeRaw`
          UPDATE "Product"
          SET "inventory" = GREATEST("inventory" - ${line.quantity}, 0)
          WHERE "id" = ${line.product.id}
        `;
      }

      for (const coupon of appliedCoupons) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            usageCount: {
              increment: 1
            }
          }
        });
      }

      if (welcomePassword) {
        welcomePayload = {
          email: customerEmail,
          firstName: customer.firstName,
          password: welcomePassword
        };
      }
    });
  } catch (error) {
    const duplicateTarget =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? Array.isArray(error.meta?.target)
          ? (error.meta.target as string[])
          : typeof error.meta?.target === "string"
            ? [error.meta.target]
            : []
        : [];

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      duplicateTarget.includes("stripeCheckoutId")
    ) {
      return;
    }

    throw error;
  }

  if (welcomePayload) {
    await sendCustomerWelcomeEmail(welcomePayload).catch((error) => {
      console.error("Welcome email delivery failed:", error);
    });
  }
}

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await handleCompletedCheckout(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
