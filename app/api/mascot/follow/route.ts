import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { createCustomerSession, getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { sendCustomerWelcomeEmail, sendTikTokFollowRewardEmail } from "@/lib/email";
import { RYO_REWARD_POINTS } from "@/lib/mascot-program";
import { compressOmbScreenshot } from "@/lib/omb-screenshot";
import { ensureCustomerRewardAccountTx } from "@/lib/reward-accounts";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectWithStatus(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/mascot?follow=${status}#tiktok-follow`, request.url), 303);
}

function redirectWithError(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/mascot?followError=${error}#tiktok-follow`, request.url), 303);
}

function splitName(name: string) {
  const [firstName] = name.trim().split(/\s+/);
  return firstName || null;
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
  const email = rawEmail || currentCustomer?.email.trim().toLowerCase() || "";
  const fullName = rawName || currentCustomerName || email.split("@")[0];

  if (!fullName || !email) {
    return redirectWithError(request, "missing");
  }

  if (!emailPattern.test(email)) {
    return redirectWithError(request, "email");
  }

  if (!(screenshot instanceof File) || screenshot.size <= 0) {
    return redirectWithError(request, "image-required");
  }

  let screenshotPayload: {
    name: string;
    mimeType: string;
    base64: string;
    bytes: number;
  };

  try {
    screenshotPayload = await compressOmbScreenshot(screenshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "image-type";
    return redirectWithError(request, message);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.tikTokFollowReward.findUnique({
        where: { email },
        select: {
          id: true,
          customerId: true
        }
      });

      if (existing) {
        return {
          status: "duplicate" as const,
          customerId: existing.customerId
        };
      }

      const { customer, tempPassword } = await ensureCustomerRewardAccountTx(tx, {
        email,
        name: fullName
      });
      const awardedAt = new Date();

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          loyaltyPoints: {
            increment: RYO_REWARD_POINTS
          }
        }
      });

      await tx.rewardEntry.create({
        data: {
          customerId: customer.id,
          type: "EARNED",
          points: RYO_REWARD_POINTS,
          note: "TikTok follow screenshot reward"
        }
      });

      await tx.tikTokFollowReward.create({
        data: {
          email,
          fullName,
          tiktokUsername,
          screenshotName: screenshotPayload.name,
          screenshotMimeType: screenshotPayload.mimeType,
          screenshotBase64: screenshotPayload.base64,
          screenshotBytes: screenshotPayload.bytes,
          customerId: customer.id,
          pointsAwarded: RYO_REWARD_POINTS,
          rewardGranted: true,
          rewardGrantedAt: awardedAt
        }
      });

      return {
        status: "awarded" as const,
        customerId: customer.id,
        customerEmail: customer.email,
        firstName: customer.firstName || splitName(fullName),
        tempPassword
      };
    });

    await createCustomerSession(result.customerId).catch((error) => {
      console.error("TikTok follow customer session creation failed:", error);
    });

    if (result.status === "awarded") {
      if (result.tempPassword) {
        await sendCustomerWelcomeEmail({
          email: result.customerEmail,
          firstName: result.firstName,
          password: result.tempPassword
        }).catch((error) => {
          console.error("TikTok follow welcome email delivery failed:", error);
        });
      }

      await sendTikTokFollowRewardEmail({
        email: result.customerEmail,
        firstName: result.firstName,
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
      const existing = await prisma.tikTokFollowReward.findUnique({
        where: { email },
        select: { customerId: true }
      });

      if (existing?.customerId) {
        await createCustomerSession(existing.customerId).catch((sessionError) => {
          console.error("TikTok follow duplicate session creation failed:", sessionError);
        });
      }

      return redirectWithStatus(request, "duplicate");
    }

    console.error("TikTok follow reward upload failed:", error);
    return redirectWithError(request, "failed");
  }
}
