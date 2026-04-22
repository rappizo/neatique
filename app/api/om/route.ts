import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import {
  getOrderMatchPlatform,
  isOrderMatchPlatform,
  validateOrderId
} from "@/lib/order-match";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const formData = await request.formData();
  const requestedPlatform = String(formData.get("platform") || "").trim().toLowerCase();
  const orderId = String(formData.get("orderId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();

  if (!isOrderMatchPlatform(requestedPlatform)) {
    return NextResponse.redirect(new URL("/om?error=platform", request.url), 303);
  }

  const platform = getOrderMatchPlatform(requestedPlatform);

  if (!orderId || !name || !email) {
    return NextResponse.redirect(new URL(`/om?platform=${platform.key}&error=missing`, request.url), 303);
  }

  if (!emailPattern.test(email)) {
    return NextResponse.redirect(new URL(`/om?platform=${platform.key}&error=email`, request.url), 303);
  }

  if (!validateOrderId(platform.key, orderId)) {
    return NextResponse.redirect(new URL(`/om?platform=${platform.key}&error=order-id`, request.url), 303);
  }

  const [existingOrderClaim, existingEmailClaim] = await prisma.$transaction([
    prisma.ombClaim.findFirst({
      where: {
        completedAt: {
          not: null
        },
        orderId
      },
      select: { id: true }
    }),
    prisma.ombClaim.findFirst({
      where: {
        completedAt: {
          not: null
        },
        email
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

  const claim = await prisma.ombClaim.create({
    data: {
      platformKey: platform.key,
      platformLabel: platform.label,
      orderId,
      name,
      email,
      phone: phone || null
    }
  });

  try {
    await syncEmailMarketingContact({
      email,
      audienceType: "CUSTOMERS",
      force: true,
      fullName: name,
      source: "OMB_FLOW"
    });
  } catch (error) {
    console.error("OMB Brevo customer sync failed:", error);
  }

  return NextResponse.redirect(
    new URL(`/om2?platform=${platform.key}&claim=${claim.id}`, request.url),
    303
  );
}
