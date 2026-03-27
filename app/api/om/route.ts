import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

  return NextResponse.redirect(
    new URL(`/om2?platform=${platform.key}&claim=${claim.id}`, request.url),
    303
  );
}
