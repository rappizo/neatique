import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { RYO_REWARD_POINTS } from "@/lib/mascot-program";

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
          <h1>Your registration is complete and {RYO_REWARD_POINTS} points are on the way.</h1>
          <p>
            Our system has received your Register Your Order submission. Once the registration is
            confirmed, the reward points stay on your account and can be used toward mascot
            redemptions.
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
