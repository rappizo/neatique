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
          <h1>Your mascot redemption is confirmed and your account is ready.</h1>
          <p>
            Your points were redeemed successfully and you are now signed in. If this is a new
            account, set a password from the account center whenever you are ready. Once the mascot
            ships, we will email you the carrier and tracking number.
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
