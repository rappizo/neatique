import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrderMatchPlatform, isHighRating } from "@/lib/order-match";
import { compressOmbScreenshot } from "@/lib/omb-screenshot";
import { completeRyoClaimWithPoints } from "@/lib/ryo-claims";

export const runtime = "nodejs";

function redirectWithError(request: Request, claimId: string, error: string) {
  return NextResponse.redirect(new URL(`/ryo3?claim=${claimId}&error=${error}`, request.url), 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const claimId = String(formData.get("claimId") || "").trim();
  const screenshot = formData.get("screenshot");

  const claim = claimId
    ? await prisma.ryoClaim.findUnique({
        where: { id: claimId }
      })
    : null;

  if (!claim) {
    return NextResponse.redirect(new URL("/ryo?error=claim", request.url), 303);
  }

  if (claim.completedAt) {
    return NextResponse.redirect(new URL(`/ryo2/thank-you?claim=${claim.id}`, request.url), 303);
  }

  if (!claim.reviewRating || !isHighRating(claim.reviewRating)) {
    return NextResponse.redirect(new URL(`/ryo2/thank-you?claim=${claim.id}`, request.url), 303);
  }

  const platform = getOrderMatchPlatform(claim.platformKey);

  let screenshotPayload:
    | {
        name: string;
        mimeType: string;
        base64: string;
        bytes: number;
      }
    | undefined;

  if (platform.key !== "amazon") {
    if (!(screenshot instanceof File) || screenshot.size <= 0) {
      return redirectWithError(request, claim.id, "image-required");
    }

    try {
      screenshotPayload = await compressOmbScreenshot(screenshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "image-type";
      return redirectWithError(request, claim.id, message);
    }
  }

  const completionResult = await completeRyoClaimWithPoints({
    claimId: claim.id,
    completionData: {
      screenshotName: screenshotPayload?.name ?? null,
      screenshotMimeType: screenshotPayload?.mimeType ?? null,
      screenshotBase64: screenshotPayload?.base64 ?? null,
      screenshotBytes: screenshotPayload?.bytes ?? null
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

  revalidatePath("/account");
  revalidatePath("/admin/rewards");
  revalidatePath("/rd");
  return NextResponse.redirect(new URL(`/ryo2/thank-you?claim=${claim.id}`, request.url), 303);
}
