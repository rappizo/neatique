import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  getOrderMatchPlatform,
  isHighRating,
  OMB_MIN_COMMENT_LENGTH
} from "@/lib/order-match";
import { completeRyoClaimSubmission } from "@/lib/ryo-claims";

function redirectWithError(request: Request, claimId: string, platformKey: string, error: string) {
  return NextResponse.redirect(
    new URL(`/ryo2?claim=${claimId}&platform=${platformKey}&error=${error}`, request.url),
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
    ? await prisma.ryoClaim.findUnique({
        where: { id: claimId }
      })
    : null;

  if (!claim) {
    return NextResponse.redirect(new URL("/ryo2?error=claim", request.url), 303);
  }

  if (claim.completedAt) {
    return NextResponse.redirect(new URL(`/ryo2/thank-you?claim=${claim.id}`, request.url), 303);
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

  if (highRating) {
    await prisma.ryoClaim.update({
      where: { id: claim.id },
      data: {
        purchasedProduct: product.productShortName,
        reviewRating: rating,
        commentText,
        reviewDestinationUrl,
        screenshotName: null,
        screenshotMimeType: null,
        screenshotBase64: null,
        screenshotBytes: null,
        completedAt: null
      }
    });

    return NextResponse.redirect(new URL(`/ryo3?claim=${claim.id}`, request.url), 303);
  }

  const completionResult = await completeRyoClaimSubmission({
    claimId: claim.id,
    completionData: {
      purchasedProduct: product.productShortName,
      reviewRating: rating,
      commentText,
      reviewDestinationUrl,
      screenshotName: null,
      screenshotMimeType: null,
      screenshotBase64: null,
      screenshotBytes: null
    }
  });

  if (completionResult.status === "duplicate-order") {
    return NextResponse.redirect(
      new URL(`/ryo?platform=${platform.key}&error=${completionResult.status}`, request.url),
      303
    );
  }

  if (completionResult.status === "missing") {
    return NextResponse.redirect(new URL("/ryo2?error=claim", request.url), 303);
  }

  revalidatePath("/admin/rewards");
  return NextResponse.redirect(new URL(`/ryo2/thank-you?claim=${claim.id}`, request.url), 303);
}
