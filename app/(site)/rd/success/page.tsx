import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Mascot Redemption Submitted",
  description: "Your mascot redemption request has been submitted successfully."
};

export default function RedeemMascotSuccessPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="page-hero om-thank-you">
          <p className="eyebrow">Redeem submitted</p>
          <h1>Your mascot redemption request is in. We will review it and ship it soon.</h1>
          <p>
            Your points were reserved successfully. Our team can now process the shipping details
            you submitted for the mascot reward.
          </p>
          <div className="stack-row">
            <ButtonLink href="/account" variant="primary">
              View my account
            </ButtonLink>
            <ButtonLink href="/rd" variant="secondary">
              Redeem another mascot
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
