import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrderMatchPlatform,
  isHighRating,
  OMB_MIN_COMMENT_LENGTH
} from "@/lib/order-match";

function redirectWithError(request: Request, claimId: string, platformKey: string, error: string) {
  return NextResponse.redirect(
    new URL(`/om2?claim=${claimId}&platform=${platformKey}&error=${error}`, request.url),
    303
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const claimId = String(formData.get("claimId") || "").trim();
  const purchasedProduct = String(formData.get("purchasedProduct") || "").trim();
  const rating = Number.parseInt(String(formData.get("rating") || "").trim(), 10);
  const commentText = String(formData.get("commentText") || "").trim();

  const claim = claimId
    ? await prisma.ombClaim.findUnique({
        where: { id: claimId }
      })
    : null;

  if (!claim) {
    return NextResponse.redirect(new URL("/om2?error=claim", request.url), 303);
  }

  const platform = getOrderMatchPlatform(claim.platformKey);
  const product = await prisma.product.findFirst({
    where: {
      productShortName: purchasedProduct
    },
    select: {
      productShortName: true,
      amazonAsin: true
    }
  });

  if (!product?.productShortName) {
    return redirectWithError(request, claim.id, platform.key, "product");
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return redirectWithError(request, claim.id, platform.key, "rating");
  }

  if (commentText.length < OMB_MIN_COMMENT_LENGTH) {
    return redirectWithError(request, claim.id, platform.key, "comment");
  }

  const reviewDestinationUrl =
    platform.key === "amazon"
      ? product.amazonAsin
        ? `https://www.amazon.com/review/create-review/?asin=${encodeURIComponent(product.amazonAsin)}`
        : null
      : platform.outboundUrl;

  const highRating = isHighRating(rating);

  if (!highRating) {
    const [existingOrderClaim, existingEmailClaim] = await prisma.$transaction([
      prisma.ombClaim.findFirst({
        where: {
          id: {
            not: claim.id
          },
          completedAt: {
            not: null
          },
          orderId: claim.orderId
        },
        select: { id: true }
      }),
      prisma.ombClaim.findFirst({
        where: {
          id: {
            not: claim.id
          },
          completedAt: {
            not: null
          },
          email: claim.email
        },
        select: { id: true }
      })
    ]);

    if (existingOrderClaim) {
      return NextResponse.redirect(
        new URL(`/om?platform=${platform.key}&error=duplicate-order`, request.url),
        303
      );
    }

    if (existingEmailClaim) {
      return NextResponse.redirect(
        new URL(`/om?platform=${platform.key}&error=duplicate-email`, request.url),
        303
      );
    }
  }

  await prisma.ombClaim.update({
    where: { id: claim.id },
    data: {
      purchasedProduct: product.productShortName,
      reviewRating: rating,
      commentText,
      reviewDestinationUrl,
      reviewStepSubmittedAt: new Date(),
      screenshotName: null,
      screenshotMimeType: null,
      screenshotBase64: null,
      screenshotBytes: null,
      extraBottleAddress: null,
      completedAt: highRating ? null : new Date()
    }
  });

  if (highRating) {
    return NextResponse.redirect(new URL(`/om3?claim=${claim.id}`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`/om2/thank-you?claim=${claim.id}`, request.url), 303);
}
