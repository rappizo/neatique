import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { sendTikTokFollowRewardEmail } from "@/lib/email";
import { createGuestRewardEventTx, getOrCreateGuestRewardSession } from "@/lib/guest-rewards";
import { RYO_REWARD_POINTS } from "@/lib/mascot-program";
import { compressOmbScreenshot } from "@/lib/omb-screenshot";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectWithStatus(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/mascot?follow=${status}#tiktok-follow`, request.url), 303);
}

function redirectWithError(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/mascot?followError=${error}#tiktok-follow`, request.url), 303);
}

function splitName(name: string) {
  return name.trim().split(/\s+/)[0] || null;
}

export async function POST(request: Request) {
  const [formData, currentCustomer] = await Promise.all([request.formData(), getCurrentCustomer()]);
  const rawName = String(formData.get("name") || "").trim();
  const rawEmail = String(formData.get("email") || "").trim().toLowerCase();
  const tiktokUsername = String(formData.get("tiktokUsername") || "").trim() || null;
  const screenshot = formData.get("screenshot");
  const currentCustomerName = currentCustomer
    ? [currentCustomer.firstName, currentCustomer.lastName].filter(Boolean).join(" ")
    : "";
  const email = currentCustomer?.email.trim().toLowerCase() || rawEmail;
  const fullName = currentCustomerName || rawName || email.split("@")[0];

  if (!fullName || !email) {
    return redirectWithError(request, "missing");
  }

  if (!emailPattern.test(email)) {
    return redirectWithError(request, "email");
  }

  if (!(screenshot instanceof File) || screenshot.size <= 0) {
    return redirectWithError(request, "image-required");
  }

  let screenshotPayload: Awaited<ReturnType<typeof compressOmbScreenshot>>;

  try {
    screenshotPayload = await compressOmbScreenshot(screenshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "image-type";
    return redirectWithError(request, message);
  }

  const screenshotSha256 = createHash("sha256")
    .update(screenshotPayload.base64)
    .digest("hex");
  const guestSession = currentCustomer
    ? null
    : await getOrCreateGuestRewardSession({ emailHint: email, nameHint: fullName });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.tikTokFollowReward.findFirst({
        where: currentCustomer
          ? { customerId: currentCustomer.id }
          : { guestSessionId: guestSession!.id },
        select: { id: true }
      });

      if (existing) {
        return { status: "duplicate" as const };
      }

      const awardedAt = new Date();
      const reward = await tx.tikTokFollowReward.create({
        data: {
          email,
          fullName,
          tiktokUsername,
          screenshotName: screenshotPayload.name,
          screenshotMimeType: screenshotPayload.mimeType,
          screenshotBase64: screenshotPayload.base64,
          screenshotBytes: screenshotPayload.bytes,
          screenshotSha256,
          customerId: currentCustomer?.id ?? null,
          guestSessionId: guestSession?.id ?? null,
          pointsAwarded: RYO_REWARD_POINTS,
          rewardGranted: true,
          rewardGrantedAt: awardedAt
        }
      });

      if (currentCustomer) {
        await tx.customer.update({
          where: { id: currentCustomer.id },
          data: { loyaltyPoints: { increment: RYO_REWARD_POINTS } }
        });
        await tx.rewardEntry.create({
          data: {
            customerId: currentCustomer.id,
            type: "EARNED",
            points: RYO_REWARD_POINTS,
            note: "TikTok follow screenshot reward"
          }
        });
      } else {
        await createGuestRewardEventTx(tx, {
          guestSessionId: guestSession!.id,
          source: "TIKTOK_FOLLOW",
          sourceId: reward.id,
          points: RYO_REWARD_POINTS,
          note: "TikTok follow screenshot reward"
        });
      }

      return { status: "awarded" as const };
    });

    if (result.status === "awarded") {
      await sendTikTokFollowRewardEmail({
        email,
        firstName: currentCustomer?.firstName || splitName(fullName),
        points: RYO_REWARD_POINTS
      }).catch((error) => {
        console.error("TikTok follow reward email delivery failed:", error);
      });
    }

    revalidatePath("/mascot");
    revalidatePath("/account");
    revalidatePath("/rd");
    revalidatePath("/admin/rewards");
    return redirectWithStatus(request, result.status);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithStatus(request, "duplicate-proof");
    }

    console.error("TikTok follow reward upload failed:", error);
    return redirectWithError(request, "failed");
  }
}
