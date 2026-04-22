import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIpFromHeaders, getUserAgentFromHeaders } from "@/lib/contact-guard";
import { sendSubscriptionCouponEmail } from "@/lib/email";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import { createFormSubmission } from "@/lib/form-submissions";
import {
  getSubscribeCouponDescription,
  SUBSCRIBE_COUPON_CODE,
  SUBSCRIBE_COUPON_PERCENT_OFF
} from "@/lib/subscribe-offer";
import {
  assessSubscribeSubmissionRisk,
  normalizeSubscribeSubmissionInput,
  validateSubscribeSubmissionInput
} from "@/lib/subscribe-guard";

export async function POST(request: Request) {
  const formData = await request.formData();
  const submission = normalizeSubscribeSubmissionInput(formData);
  const validationError = validateSubscribeSubmissionInput(submission);
  const ipAddress = getClientIpFromHeaders(request.headers);
  const userAgent = getUserAgentFromHeaders(request.headers);

  if (validationError) {
    return NextResponse.redirect(new URL("/?subscribe_error=invalid", request.url), 303);
  }

  const moderation = await assessSubscribeSubmissionRisk({
    submission,
    ipAddress
  });

  if (moderation.blocked) {
    console.warn("Blocked suspicious subscribe submission", {
      email: submission.email,
      reasons: moderation.reasons,
      score: moderation.score,
      ipAddress
    });
    return NextResponse.redirect(new URL("/?subscribed=1", request.url), 303);
  }

  const email = submission.email;

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
      offer: getSubscribeCouponDescription(),
      meta: {
        ipAddress,
        userAgent,
        submittedAt: new Date().toISOString()
      },
      moderation
    }
  });

  try {
    await syncEmailMarketingContact({
      email,
      audienceType: "NEWSLETTER",
      force: true,
      source: "SUBSCRIBE_FORM"
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
