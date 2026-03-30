import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSubscriptionCouponEmail } from "@/lib/email";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import { createFormSubmission } from "@/lib/form-submissions";
import {
  getSubscribeCouponDescription,
  SUBSCRIBE_COUPON_CODE,
  SUBSCRIBE_COUPON_PERCENT_OFF
} from "@/lib/subscribe-offer";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.redirect(new URL("/?subscribe_error=missing", request.url), 303);
  }

  await prisma.customer.upsert({
    where: { email },
    update: {
      marketingOptIn: true
    },
    create: {
      email,
      marketingOptIn: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: SUBSCRIBE_COUPON_CODE },
    update: {},
    create: {
      code: SUBSCRIBE_COUPON_CODE,
      content: `${getSubscribeCouponDescription()} subscriber welcome offer`,
      active: true,
      combinable: false,
      appliesToAll: true,
      discountType: "PERCENT",
      percentOff: SUBSCRIBE_COUPON_PERCENT_OFF,
      usageMode: "UNLIMITED"
    }
  });

  await createFormSubmission({
    formKey: "subscribe",
    email,
    summary: `${SUBSCRIBE_COUPON_CODE} subscriber signup`,
    message: `Subscriber requested the ${SUBSCRIBE_COUPON_CODE} welcome coupon email.`,
    payload: {
      email,
      couponCode: SUBSCRIBE_COUPON_CODE,
      offer: getSubscribeCouponDescription()
    }
  });

  try {
    await syncEmailMarketingContact({
      email,
      audienceType: "NEWSLETTER"
    });
  } catch (error) {
    console.error("Brevo subscribe sync failed:", error);
  }

  try {
    const result = await sendSubscriptionCouponEmail({ email });

    if (!result.delivered) {
      return NextResponse.redirect(new URL("/?subscribe_error=email", request.url), 303);
    }
  } catch (error) {
    console.error("Subscription email delivery failed:", error);
    return NextResponse.redirect(new URL("/?subscribe_error=email", request.url), 303);
  }

  return NextResponse.redirect(new URL("/?subscribed=1", request.url), 303);
}
