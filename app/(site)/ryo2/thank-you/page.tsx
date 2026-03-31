import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "RYO Submitted",
  description: "Thank you for completing your order registration."
};

export default function RyoThankYouPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="page-hero om-thank-you">
          <p className="eyebrow">Thank you</p>
          <h1>Your order registration has been submitted for review.</h1>
          <p>
            Our team will review your RYO submission within 24 hours. Once it is approved, we will
            email your registered address to confirm that the points were added, and then you can
            go to the mascot redemption page to claim your reward.
          </p>
          <div className="stack-row">
            <ButtonLink href="/mascot" variant="primary">
              View mascot rewards
            </ButtonLink>
            <ButtonLink href="/ryo" variant="secondary">
              Register another order
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
