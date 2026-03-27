import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "OMB Claim Submitted",
  description: "Thank you for completing your OMB claim."
};

export default function OmbClaimThankYouPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="page-hero om-thank-you">
          <p className="eyebrow">Thank you</p>
          <h1>Your Extra Bottle Will Be Sent in 24 Hour After We Confirm the Order.</h1>
          <p>
            Your OMB claim has been submitted successfully. Our team will review the order and the
            platform details, then continue with the extra bottle process.
          </p>
          <div className="stack-row">
            <ButtonLink href="/" variant="primary">
              Back home
            </ButtonLink>
            <ButtonLink href="/om" variant="secondary">
              Submit another claim
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
