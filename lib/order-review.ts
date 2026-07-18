import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/site-config";
import type { OrderStatus } from "@/lib/types";

export const ORDER_REVIEW_SOURCE = "ORDER_REVIEW_LINK";
export const ORDER_REVIEW_PURCHASE_CHANNEL = "Neatique website";

const orderReviewTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createOrderReviewToken() {
  return randomBytes(32).toString("base64url");
}

export function isValidOrderReviewToken(value: string | null | undefined) {
  return orderReviewTokenPattern.test((value ?? "").trim());
}

export function isOrderReviewEligibleStatus(status: OrderStatus) {
  return status === "PAID" || status === "FULFILLED";
}

export function buildOrderReviewPath(token: string) {
  return `/review-order/${encodeURIComponent(token)}`;
}

export function buildOrderReviewUrl(token: string) {
  return new URL(buildOrderReviewPath(token), siteConfig.url).toString();
}

export function makeOrderReviewDisplayName(input: {
  shippingName?: string | null;
  billingName?: string | null;
  email: string;
}) {
  const fullName = (input.shippingName || input.billingName || "").trim();
  if (fullName) {
    const [firstName] = fullName.split(/\s+/);
    return firstName || "Verified customer";
  }

  const emailName = input.email.split("@")[0]?.trim();
  return emailName || "Verified customer";
}

export async function ensureOrderReviewToken(input: {
  id: string;
  status: OrderStatus;
  reviewToken?: string | null;
  reviewTokenCreatedAt?: Date | null;
}) {
  if (!isOrderReviewEligibleStatus(input.status)) {
    return {
      reviewToken: input.reviewToken ?? null,
      reviewTokenCreatedAt: input.reviewTokenCreatedAt ?? null
    };
  }

  if (input.reviewToken) {
    return {
      reviewToken: input.reviewToken,
      reviewTokenCreatedAt: input.reviewTokenCreatedAt ?? null
    };
  }

  const reviewToken = createOrderReviewToken();
  const reviewTokenCreatedAt = new Date();
  const updated = await prisma.order.updateMany({
    where: {
      id: input.id,
      reviewToken: null,
      status: { in: ["PAID", "FULFILLED"] }
    },
    data: {
      reviewToken,
      reviewTokenCreatedAt
    }
  });

  if (updated.count > 0) {
    return { reviewToken, reviewTokenCreatedAt };
  }

  const current = await prisma.order.findUnique({
    where: { id: input.id },
    select: {
      reviewToken: true,
      reviewTokenCreatedAt: true
    }
  });

  return {
    reviewToken: current?.reviewToken ?? null,
    reviewTokenCreatedAt: current?.reviewTokenCreatedAt ?? null
  };
}

export async function getOrderReviewAccess(rawToken: string) {
  const token = rawToken.trim();
  if (!isValidOrderReviewToken(token)) {
    return null;
  }

  const order = await prisma.order.findUnique({
    where: { reviewToken: token },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      status: true,
      shippingName: true,
      billingName: true,
      customerId: true,
      items: {
        select: {
          id: true,
          productId: true,
          name: true,
          slug: true,
          imageUrl: true,
          quantity: true
        }
      },
      reviews: {
        select: {
          id: true,
          productId: true,
          status: true
        }
      }
    }
  });

  if (!order || !isOrderReviewEligibleStatus(order.status)) {
    return null;
  }

  const seenProductIds = new Set<string>();
  const products = order.items.filter((item) => {
    if (!item.productId || seenProductIds.has(item.productId)) {
      return false;
    }

    seenProductIds.add(item.productId);
    return true;
  });

  return {
    ...order,
    displayName: makeOrderReviewDisplayName(order),
    products
  };
}
