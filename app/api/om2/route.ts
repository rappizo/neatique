import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrderMatchPlatform,
  isHighRating,
  OMB_MIN_COMMENT_LENGTH,
  validateOmbProduct
} from "@/lib/order-match";
import { compressOmbScreenshot } from "@/lib/omb-screenshot";

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
  const extraBottleAddress = String(formData.get("extraBottleAddress") || "").trim();
  const screenshot = formData.get("screenshot");

  const claim = claimId
    ? await prisma.ombClaim.findUnique({
        where: { id: claimId }
      })
    : null;

  if (!claim) {
    return NextResponse.redirect(new URL("/om2?error=claim", request.url), 303);
  }

  const platform = getOrderMatchPlatform(claim.platformKey);

  if (!validateOmbProduct(purchasedProduct)) {
    return redirectWithError(request, claim.id, platform.key, "product");
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return redirectWithError(request, claim.id, platform.key, "rating");
  }

  if (commentText.length < OMB_MIN_COMMENT_LENGTH) {
    return redirectWithError(request, claim.id, platform.key, "comment");
  }

  let screenshotPayload:
    | {
        name: string;
        mimeType: string;
        base64: string;
        bytes: number;
      }
    | undefined;

  if (isHighRating(rating)) {
    if (!(screenshot instanceof File) || screenshot.size <= 0) {
      return redirectWithError(request, claim.id, platform.key, "image-required");
    }

    if (!extraBottleAddress) {
      return redirectWithError(request, claim.id, platform.key, "address");
    }

    try {
      screenshotPayload = await compressOmbScreenshot(screenshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "image-type";
      return redirectWithError(request, claim.id, platform.key, message);
    }
  }

  await prisma.ombClaim.update({
    where: { id: claim.id },
    data: {
      purchasedProduct,
      reviewRating: rating,
      commentText,
      reviewDestinationUrl: platform.outboundUrl,
      screenshotName: screenshotPayload?.name ?? null,
      screenshotMimeType: screenshotPayload?.mimeType ?? null,
      screenshotBase64: screenshotPayload?.base64 ?? null,
      screenshotBytes: screenshotPayload?.bytes ?? null,
      extraBottleAddress: isHighRating(rating) ? extraBottleAddress : null,
      completedAt: new Date()
    }
  });

  return NextResponse.redirect(
    new URL(`/om2?claim=${claim.id}&platform=${platform.key}&status=submitted`, request.url),
    303
  );
}
