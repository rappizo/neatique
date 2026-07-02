import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { getOrderMatchPlatform, isHighRating } from "@/lib/order-match";
import { compressOmbScreenshot } from "@/lib/omb-screenshot";
import { completeRyoClaimSubmission } from "@/lib/ryo-claims";

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
    if (!claim.rewardGranted) {
      const completionResult = await completeRyoClaimSubmission({
        claimId: claim.id
      });

      if (completionResult.status === "completed") {
        await createCustomerSession(completionResult.customerId).catch((error) => {
          console.error("RYO customer session creation failed:", error);
        });
        revalidatePath("/admin/rewards");
        revalidatePath("/admin/rewards/ryo");
        revalidatePath("/account");
        revalidatePath("/rd");
      }
    }

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

  const completionResult = await completeRyoClaimSubmission({
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

  if (completionResult.status === "completed") {
    await createCustomerSession(completionResult.customerId).catch((error) => {
      console.error("RYO customer session creation failed:", error);
    });
  }

  revalidatePath("/admin/rewards");
  revalidatePath("/admin/rewards/ryo");
  revalidatePath("/account");
  revalidatePath("/rd");
  return NextResponse.redirect(new URL(`/ryo2/thank-you?claim=${claim.id}`, request.url), 303);
}
