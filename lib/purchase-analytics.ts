import { prisma } from "@/lib/db";
import { parseCheckoutCartMetadataItems } from "@/lib/checkout-metadata";
import { stripe } from "@/lib/stripe";
import type { GoogleAnalyticsItem, GoogleAnalyticsParams } from "@/lib/analytics";

export type PurchaseAnalytics = {
  transactionId: string;
  params: GoogleAnalyticsParams;
};

function buildParams(input: {
  transactionId: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  coupon?: string | null;
  orderNumber?: string | null;
  items: GoogleAnalyticsItem[];
}): PurchaseAnalytics {
  return {
    transactionId: input.transactionId,
    params: {
      transaction_id: input.transactionId,
      affiliation: "Neatique Beauty Online Store",
      currency: input.currency.toUpperCase(),
      value: Math.max(0, input.subtotalCents - input.discountCents) / 100,
      tax: input.taxCents / 100,
      shipping: input.shippingCents / 100,
      coupon: input.coupon || undefined,
      order_number: input.orderNumber || undefined,
      items: input.items
    }
  };
}

export async function getPurchaseAnalytics(sessionId: string): Promise<PurchaseAnalytics | null> {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId.startsWith("cs_")) {
    return null;
  }

  const order = await prisma.order.findUnique({
    where: { stripeCheckoutId: normalizedSessionId },
    include: {
      items: {
        include: {
          product: {
            select: { productCode: true, category: true }
          }
        }
      }
    }
  });

  if (order?.status === "PAID") {
    return buildParams({
      transactionId: normalizedSessionId,
      currency: order.currency,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      coupon: order.couponCode,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        item_id: item.product?.productCode || item.productId || item.id,
        item_name: item.name,
        affiliation: "Neatique Beauty Online Store",
        item_brand: "Neatique",
        item_category: item.product?.category || "Skincare",
        price: item.unitPriceCents / 100,
        quantity: item.quantity
      }))
    });
  }

  if (!stripe) {
    return null;
  }

  const session = await stripe.checkout.sessions.retrieve(normalizedSessionId);

  if (session.payment_status !== "paid") {
    return null;
  }

  const metadataItems = parseCheckoutCartMetadataItems(session.metadata);
  const products = await prisma.product.findMany({
    where: { id: { in: metadataItems.map((item) => item.productId) } },
    select: { id: true, productCode: true, name: true, category: true }
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const discountCents = Math.max(0, Number(session.metadata?.discountCents || 0) || 0);
  const subtotalCents = metadataItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  return buildParams({
    transactionId: normalizedSessionId,
    currency: session.currency || "USD",
    subtotalCents,
    discountCents,
    shippingCents: session.total_details?.amount_shipping || 0,
    taxCents: session.total_details?.amount_tax || 0,
    coupon: session.metadata?.couponCodes,
    items: metadataItems.map((item) => {
      const product = productMap.get(item.productId);

      return {
        item_id: product?.productCode || item.productId,
        item_name: product?.name || item.productId,
        affiliation: "Neatique Beauty Online Store",
        item_brand: "Neatique",
        item_category: product?.category || "Skincare",
        price: item.unitPriceCents / 100,
        quantity: item.quantity
      };
    })
  });
}
