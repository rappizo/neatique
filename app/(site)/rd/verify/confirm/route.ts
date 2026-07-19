import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createCustomerSession } from "@/lib/customer-auth";
import { completeGuestRedemption } from "@/lib/guest-redemption";
import { clearGuestRewardCookie, getGuestRewardSession } from "@/lib/guest-rewards";

export async function POST(request: Request) {
  const [formData, guestSession] = await Promise.all([
    request.formData(),
    getGuestRewardSession()
  ]);
  const draftId = String(formData.get("draftId") || "").trim();
  const code = String(formData.get("code") || "").trim();

  if (!guestSession || !draftId) {
    return NextResponse.redirect(new URL("/rd?error=session", request.url), 303);
  }

  try {
    const result = await completeGuestRedemption({
      draftId,
      guestSessionId: guestSession.id,
      code
    });

    if (result.status === "completed") {
      await createCustomerSession(result.customerId);
      await clearGuestRewardCookie();
      revalidatePath("/account");
      revalidatePath("/rd");
      revalidatePath("/admin/rewards");
      const successUrl = new URL("/rd/success", request.url);
      successUrl.searchParams.set("mascot", result.mascotSlug);
      successUrl.searchParams.set("account", "ready");
      return NextResponse.redirect(successUrl, 303);
    }

    if (result.status === "already-complete") {
      if (result.customerId) {
        await createCustomerSession(result.customerId);
        await clearGuestRewardCookie();
      }
      return NextResponse.redirect(new URL(`/rd/success?mascot=${result.mascotSlug}`, request.url), 303);
    }

    if (result.status === "points") {
      return NextResponse.redirect(new URL("/rd?error=points", request.url), 303);
    }

    const verifyUrl = new URL("/rd/verify", request.url);
    verifyUrl.searchParams.set("draft", draftId);
    verifyUrl.searchParams.set("error", result.status);
    return NextResponse.redirect(verifyUrl, 303);
  } catch (error) {
    console.error("Guest mascot redemption verification failed:", error);
    const verifyUrl = new URL("/rd/verify", request.url);
    verifyUrl.searchParams.set("draft", draftId);
    verifyUrl.searchParams.set("error", "failed");
    return NextResponse.redirect(verifyUrl, 303);
  }
}
