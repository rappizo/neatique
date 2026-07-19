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
          <h1>Your order registration is complete, and your 500 points are ready.</h1>
          <p>
            Your RYO points are saved in this browser—no account was required. Complete the TikTok
            follow screenshot upload too, then verify your email only at the final mascot redemption
            step.
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
