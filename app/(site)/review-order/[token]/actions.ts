"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  buildOrderReviewPath,
  getOrderReviewAccess,
  ORDER_REVIEW_PURCHASE_CHANNEL,
  ORDER_REVIEW_SOURCE
} from "@/lib/order-review";
import { toInt, toPlainString } from "@/lib/utils";

function buildReviewRedirect(token: string, status: string, productId?: string) {
  const params = new URLSearchParams({ status });
  if (productId) {
    params.set("product", productId);
  }

  return `${buildOrderReviewPath(token)}?${params.toString()}${productId ? `#product-${productId}` : ""}`;
}

export async function submitOrderReviewAction(formData: FormData) {
  const token = toPlainString(formData.get("token"));
  const productId = toPlainString(formData.get("productId"));
  const rating = Math.max(1, Math.min(5, toInt(formData.get("rating"), 5)));
  const title = toPlainString(formData.get("title"));
  const content = toPlainString(formData.get("content"));
  const access = await getOrderReviewAccess(token);

  if (!access) {
    redirect(buildReviewRedirect(token, "invalid-link"));
  }

  const purchasedProduct = access.products.find((item) => item.productId === productId);
  if (!purchasedProduct?.productId) {
    redirect(buildReviewRedirect(token, "invalid-product"));
  }

  if (title.length < 3 || title.length > 120 || content.length < 10 || content.length > 5000) {
    redirect(buildReviewRedirect(token, "invalid-review", productId));
  }

  const alreadyReviewed = access.reviews.some((review) => review.productId === productId);
  if (alreadyReviewed) {
    redirect(buildReviewRedirect(token, "already-submitted", productId));
  }

  try {
    await prisma.productReview.create({
      data: {
        productId,
        orderId: access.id,
        customerId: access.customerId,
        rating,
        hasRating: true,
        title,
        content,
        displayName: access.displayName,
        purchaseChannel: ORDER_REVIEW_PURCHASE_CHANNEL,
        reviewDate: new Date(),
        status: "PENDING",
        verifiedPurchase: true,
        incentivizedReview: false,
        source: ORDER_REVIEW_SOURCE
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(buildReviewRedirect(token, "already-submitted", productId));
    }

    throw error;
  }

  revalidatePath(buildOrderReviewPath(token));
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${purchasedProduct.slug}`);
  redirect(buildReviewRedirect(token, "submitted", productId));
}
