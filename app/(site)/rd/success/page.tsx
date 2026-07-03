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
          <h1>Your mascot redemption request is in. We will verify it before shipping.</h1>
          <p>
            Your points were reserved successfully. Our team will confirm that your TikTok following
            screenshot and RYO flow are valid, then prepare your mascot shipment. Once it ships, we
            will email you the carrier and tracking number.
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
