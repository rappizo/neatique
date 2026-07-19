import { NextResponse } from "next/server";
import { sendMascotRedemptionVerificationEmail } from "@/lib/email";
import { resendGuestRedemptionCode } from "@/lib/guest-redemption";
import { getGuestRewardSession } from "@/lib/guest-rewards";

export async function POST(request: Request) {
  const [formData, guestSession] = await Promise.all([
    request.formData(),
    getGuestRewardSession()
  ]);
  const draftId = String(formData.get("draftId") || "").trim();

  if (!guestSession || !draftId) {
    return NextResponse.redirect(new URL("/rd?error=session", request.url), 303);
  }

  const result = await resendGuestRedemptionCode({
    draftId,
    guestSessionId: guestSession.id
  });
  const verifyUrl = new URL("/rd/verify", request.url);
  verifyUrl.searchParams.set("draft", draftId);

  if (result.status !== "sent") {
    verifyUrl.searchParams.set("error", result.status);
    return NextResponse.redirect(verifyUrl, 303);
  }

  const delivery = await sendMascotRedemptionVerificationEmail({
    email: result.draft.email,
    firstName: result.draft.fullName.trim().split(/\s+/)[0] || null,
    mascotName: result.draft.mascot.name,
    code: result.code
  });

  if (!delivery.delivered) {
    console.error("Mascot redemption verification resend failed:", delivery);
    verifyUrl.searchParams.set("error", "delivery");
  } else {
    verifyUrl.searchParams.set("status", "resent");
  }

  return NextResponse.redirect(verifyUrl, 303);
}
