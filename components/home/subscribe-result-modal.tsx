"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SUBSCRIBE_COUPON_CODE } from "@/lib/subscribe-offer";

export function SubscribeResultModal() {
  const params = useSearchParams();
  const error = params.get("subscribe_error");
  const subscribed = params.get("subscribed");

  if (error === "email") {
    return (
      <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-error-title">
        <div className="success-modal__backdrop" />
        <div className="success-modal__panel">
          <p className="eyebrow">Subscription saved</p>
          <h2 id="subscribe-error-title">We saved your signup, but the email has not gone out yet.</h2>
          <p>Your subscription was recorded, but the coupon email could not be delivered right now. Please try again shortly or contact the team if this continues.</p>
          <Link href="/" className="button button--primary">Close</Link>
        </div>
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-invalid-title">
        <div className="success-modal__backdrop" />
        <div className="success-modal__panel">
          <p className="eyebrow">Check your email</p>
          <h2 id="subscribe-invalid-title">Please enter a valid email address.</h2>
          <p>We could not save the subscription because the email format looked incomplete.</p>
          <Link href="/#subscribe-offer" className="button button--primary">Try again</Link>
        </div>
      </div>
    );
  }

  if (subscribed === "1") {
    return (
      <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-success-title">
        <div className="success-modal__backdrop" />
        <div className="success-modal__panel">
          <p className="eyebrow">Check your inbox</p>
          <h2 id="subscribe-success-title">Your welcome offer is on the way.</h2>
          <p>We just sent {SUBSCRIBE_COUPON_CODE} to your email. Check spam or promotions if it does not arrive shortly.</p>
          <Link href="/" className="button button--primary">Continue browsing</Link>
        </div>
      </div>
    );
  }

  return null;
}
