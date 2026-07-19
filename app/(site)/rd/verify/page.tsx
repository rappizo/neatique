import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getOwnedGuestRedemptionDraft } from "@/lib/guest-redemption";
import { getGuestRewardSession, maskEmail } from "@/lib/guest-rewards";

type VerifyRedemptionPageProps = {
  searchParams: Promise<{
    draft?: string;
    error?: string;
    status?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Verify Mascot Redemption",
  description: "Verify your email to finish the Neatique mascot redemption."
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid-code":
      return "That code is not correct. Please check the email and try again.";
    case "code-expired":
      return "That code has expired. Request a new code below.";
    case "locked":
      return "Too many incorrect attempts. Request a new code before trying again.";
    case "delivery":
      return "We could not confirm email delivery. Check spam, then request a new code if needed.";
    case "rate-limited":
      return "Too many codes were requested. Please wait 15 minutes before trying again.";
    case "cooldown":
      return "Please wait one minute before requesting another code.";
    case "expired":
      return "This redemption draft expired. Return to the mascot catalog and start again.";
    case "failed":
      return "We could not complete the verification. Please try again.";
    default:
      return null;
  }
}

export default async function VerifyRedemptionPage({ searchParams }: VerifyRedemptionPageProps) {
  const [params, guestSession] = await Promise.all([searchParams, getGuestRewardSession()]);

  if (!params.draft || !guestSession) {
    redirect("/rd");
  }

  const draft = await getOwnedGuestRedemptionDraft({
    draftId: params.draft,
    guestSessionId: guestSession.id
  });

  if (!draft) {
    redirect("/rd");
  }

  const errorMessage = getErrorMessage(params.error);
  const expired = draft.status !== "PENDING_VERIFICATION" || draft.reservedUntil <= new Date();

  return (
    <section className="section">
      <div className="container">
        <div className="checkout-confirmation-layout">
          <section className="admin-form checkout-confirmation-main reward-verification-card">
            <p className="eyebrow">Final step</p>
            <h1>Verify your email to confirm the redemption.</h1>
            <p>
              We sent a six-digit code to <strong>{maskEmail(draft.email)}</strong>. Enter it below.
              Your account and mascot shipment request are created only after the code is verified.
            </p>

            {params.status === "resent" ? (
              <p className="notice">A new verification code was sent. The previous code no longer works.</p>
            ) : null}
            {errorMessage ? <p className="notice notice--warning">{errorMessage}</p> : null}

            {!expired ? (
              <form action="/rd/verify/confirm" method="post" className="contact-form reward-verification-form">
                <input type="hidden" name="draftId" value={draft.id} />
                <div className="field">
                  <label htmlFor="redemption-code">Six-digit verification code</label>
                  <input
                    id="redemption-code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="button button--primary">
                  Confirm redemption
                </button>
              </form>
            ) : null}

            <form action="/rd/verify/resend" method="post" className="reward-verification-resend">
              <input type="hidden" name="draftId" value={draft.id} />
              <button type="submit" className="button button--secondary" disabled={expired}>
                Send a new code
              </button>
            </form>
            <p className="form-note">
              For security, codes expire after 10 minutes and a redemption draft expires after 30 minutes.
            </p>
          </section>

          <aside className="admin-form checkout-confirmation-summary">
            <Image
              src={draft.mascot.imageUrl}
              alt={draft.mascot.name}
              width={520}
              height={520}
              unoptimized
            />
            <h2>{draft.mascot.name}</h2>
            <div className="checkout-confirmation-summary__totals">
              <div>
                <span>Points</span>
                <strong>{draft.mascot.pointsCost.toLocaleString()} pts</strong>
              </div>
              <div>
                <span>Ships to</span>
                <strong>{draft.fullName}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
