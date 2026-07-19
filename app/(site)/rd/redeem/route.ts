import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentCustomerId } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { sendMascotRedemptionVerificationEmail } from "@/lib/email";
import { createGuestRedemptionDraft } from "@/lib/guest-redemption";
import {
  clearGuestRewardCookie,
  getGuestRewardSession,
  getGuestRewardSummary,
  transferGuestRewardsTx
} from "@/lib/guest-rewards";
import { buildCheckoutAddress, validateCheckoutAddress } from "@/lib/us-address";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectToRedeem(request: Request, mascotSlug?: string, error?: string) {
  const url = new URL("/rd", request.url);

  if (mascotSlug) {
    url.searchParams.set("mascot", mascotSlug);
  }

  if (error) {
    url.searchParams.set("error", error);
  }

  return NextResponse.redirect(url, 303);
}

async function completeSignedInRedemption(input: {
  customerId: string;
  guestSessionId?: string | null;
  mascotSlug: string;
  address: ReturnType<typeof buildCheckoutAddress>;
}) {
  return prisma.$transaction(async (tx) => {
    const [customer, mascot] = await Promise.all([
      tx.customer.findUnique({ where: { id: input.customerId } }),
      tx.mascotReward.findFirst({
        where: { slug: input.mascotSlug, active: true }
      })
    ]);

    if (!customer || !mascot) {
      throw new Error(customer ? "mascot" : "session");
    }

    if (input.guestSessionId) {
      await transferGuestRewardsTx(tx, {
        guestSessionId: input.guestSessionId,
        customerId: customer.id
      });
    }

    const debited = await tx.customer.updateMany({
      where: {
        id: customer.id,
        loyaltyPoints: { gte: mascot.pointsCost }
      },
      data: {
        loyaltyPoints: { decrement: mascot.pointsCost }
      }
    });

    if (debited.count === 0) {
      throw new Error("points");
    }

    await tx.rewardEntry.create({
      data: {
        customerId: customer.id,
        type: "REDEEMED",
        points: -mascot.pointsCost,
        note: `Mascot redemption ${mascot.sku} ${mascot.name}`
      }
    });

    const redemption = await tx.mascotRedemption.create({
      data: {
        pointsSpent: mascot.pointsCost,
        status: "REQUESTED",
        email: customer.email,
        fullName: input.address.fullName,
        address1: input.address.address1,
        address2: input.address.address2 || null,
        city: input.address.city,
        state: input.address.state,
        postalCode: input.address.postalCode,
        country: input.address.country,
        customerId: customer.id,
        mascotId: mascot.id
      },
      include: { mascot: true }
    });

    return redemption;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
}

export async function POST(request: Request) {
  const [formData, customerId, guestSession] = await Promise.all([
    request.formData(),
    getCurrentCustomerId(),
    getGuestRewardSession()
  ]);
  const mascotSlug = String(formData.get("mascotSlug") || "").trim();

  if (!mascotSlug) {
    return redirectToRedeem(request, undefined, "mascot");
  }

  const shippingAddress = buildCheckoutAddress({
    fullName: formData.get("fullName"),
    address1: formData.get("address1"),
    address2: formData.get("address2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode")
  });
  const addressValidation = validateCheckoutAddress(shippingAddress);

  if (addressValidation) {
    return redirectToRedeem(
      request,
      mascotSlug,
      addressValidation === "missing" ? "address" : addressValidation
    );
  }

  if (customerId) {
    try {
      const redemption = await completeSignedInRedemption({
        customerId,
        guestSessionId: guestSession?.id,
        mascotSlug,
        address: shippingAddress
      });
      const successUrl = new URL("/rd/success", request.url);
      successUrl.searchParams.set("mascot", redemption.mascot.slug);

      if (guestSession) {
        await clearGuestRewardCookie();
      }

      revalidatePath("/account");
      revalidatePath("/rd");
      revalidatePath("/admin/rewards");
      return NextResponse.redirect(successUrl, 303);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "points";
      const message = ["mascot", "session", "points"].includes(rawMessage)
        ? rawMessage
        : "points";
      return redirectToRedeem(request, mascotSlug, message);
    }
  }

  if (!guestSession) {
    return redirectToRedeem(request, mascotSlug, "session");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return redirectToRedeem(request, mascotSlug, "email");
  }

  const [mascot, guestSummary] = await Promise.all([
    prisma.mascotReward.findFirst({
      where: { slug: mascotSlug, active: true }
    }),
    getGuestRewardSummary(guestSession.id)
  ]);

  if (!mascot) {
    return redirectToRedeem(request, mascotSlug, "mascot");
  }

  if (guestSummary.points < mascot.pointsCost) {
    return redirectToRedeem(request, mascotSlug, "points");
  }

  const result = await createGuestRedemptionDraft({
    guestSessionId: guestSession.id,
    mascotId: mascot.id,
    email,
    address: shippingAddress
  });

  if (result.status === "rate-limited") {
    return redirectToRedeem(request, mascotSlug, "rate-limited");
  }

  const firstName = shippingAddress.fullName.trim().split(/\s+/)[0] || null;
  const delivery = await sendMascotRedemptionVerificationEmail({
    email,
    firstName,
    mascotName: mascot.name,
    code: result.code
  });
  const verifyUrl = new URL("/rd/verify", request.url);
  verifyUrl.searchParams.set("draft", result.draft.id);

  if (!delivery.delivered) {
    console.error("Mascot redemption verification delivery failed:", delivery);
    verifyUrl.searchParams.set("error", "delivery");
  }

  return NextResponse.redirect(verifyUrl, 303);
}
