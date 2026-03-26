import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function createOrderNumber() {
  return `NEA-${Date.now().toString().slice(-8)}`;
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
  const checkoutId = session.id;

  const existingOrder = await prisma.order.findFirst({
    where: { stripeCheckoutId: checkoutId }
  });

  if (existingOrder) {
    return;
  }

  const metadataCustomerId = session.metadata?.customerId;
  const cartItems = (session.metadata?.cartItems || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [productId, quantity] = item.split(":");

      return {
        productId,
        quantity: Math.max(1, Number(quantity || 1))
      };
    })
    .filter((item) => item.productId);

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
        lineTotalCents: product.priceCents * item.quantity
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

  const shippingDetails = session.collected_information?.shipping_details;
  const customerName = session.customer_details?.name || shippingDetails?.name;
  const nameParts = splitCustomerName(customerName);
  const address = session.customer_details?.address || shippingDetails?.address;
  const fallbackSubtotal = resolvedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const totalCents = session.amount_total ?? fallbackSubtotal;
  const subtotalCents = session.amount_subtotal ?? fallbackSubtotal;
  const shippingCents = 0;
  const taxCents = session.total_details?.amount_tax ?? 0;
  const pointsEarned = resolvedLines.reduce(
    (sum, line) => sum + line.product.pointsReward * line.quantity,
    0
  );

  const existingCustomer = metadataCustomerId
    ? await prisma.customer.findUnique({
        where: { id: metadataCustomerId }
      })
    : await prisma.customer.findUnique({
        where: { email: customerEmail }
      });

  const customer = existingCustomer
    ? await prisma.customer.update({
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
    : await prisma.customer.create({
        data: {
          email: customerEmail,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          totalSpentCents: totalCents,
          loyaltyPoints: pointsEarned,
          marketingOptIn: false
        }
      });

  const order = await prisma.order.create({
    data: {
      orderNumber: createOrderNumber(),
      email: customerEmail,
      status: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      currency: (session.currency || "usd").toUpperCase(),
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      pointsEarned,
      stripeCheckoutId: checkoutId,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      shippingName: customerName || null,
      shippingAddress1: address?.line1 || null,
      shippingAddress2: address?.line2 || null,
      shippingCity: address?.city || null,
      shippingState: address?.state || null,
      shippingPostalCode: address?.postal_code || null,
      shippingCountry: address?.country || null,
      customerId: customer.id,
      items: {
        create: resolvedLines.map((line) => ({
          productId: line.product.id,
          name: line.product.name,
          slug: line.product.slug,
          quantity: line.quantity,
          unitPriceCents: line.product.priceCents,
          lineTotalCents: line.lineTotalCents,
          imageUrl: line.product.imageUrl
        }))
      }
    }
  });

  if (pointsEarned > 0) {
    await prisma.rewardEntry.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        type: "EARNED",
        points: pointsEarned,
        note: `Paid order ${order.orderNumber}`
      }
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
