"use client";

import { useMemo, useState } from "react";

type OmbClaimStepThreeFormProps = {
  claimId: string;
  platformKey: string;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone: string | null;
  purchasedProduct: string;
  reviewRating: number;
  commentText: string;
  destinationUrl: string | null;
  outboundButtonLabel: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  calloutText?: string;
  submitAction?: string;
  submitLabel?: string;
  addressLabel?: string;
  includeAddress?: boolean;
};

export function OmbClaimStepThreeForm({
  claimId,
  platformKey,
  platformLabel,
  orderId,
  name,
  email,
  phone,
  purchasedProduct,
  reviewRating,
  commentText,
  destinationUrl,
  outboundButtonLabel,
  eyebrow = "OMB Process / Last Step",
  title = "You are almost done. Finish the last step to complete your OMB claim.",
  description = `Copy your review text, post it on ${platformLabel}, then upload the proof and leave the address for your extra bottle. Once this step is submitted, your claim is complete.`,
  calloutText = `Copy the review text you already wrote, open the ${platformLabel} review page, and paste the same text there before you submit the final claim below.`,
  submitAction = "/api/om3",
  submitLabel = "Submit OMB Claim",
  addressLabel = "Leave the address for an extra bottle",
  includeAddress = true
}: OmbClaimStepThreeFormProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [selectedFileName, setSelectedFileName] = useState("");
  const requiresScreenshot = useMemo(() => platformKey !== "amazon", [platformKey]);
  const canUseOutboundButton = Boolean(destinationUrl);

  async function handleCopyAndGo() {
    if (!canUseOutboundButton) {
      return;
    }

    try {
      await navigator.clipboard.writeText(commentText.trim());
      setCopyState("copied");
    } catch (error) {
      console.error("Could not copy review text:", error);
    }

    if (destinationUrl) {
      window.open(destinationUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="om-shell">
      <div className="om-shell__header">
        <div className="section-heading">
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="section-heading__description">{description}</p>
        </div>
        <div className="page-hero__stats">
          <span className="pill">{platformLabel}</span>
          <span className="pill">Order {orderId}</span>
          <span className="pill">{reviewRating} Star Review</span>
        </div>
      </div>

      <div className="om-shell__body">
        <form action={submitAction} method="post" encType="multipart/form-data" className="contact-form">
          <input type="hidden" name="claimId" value={claimId} />
          <input type="hidden" name="platform" value={platformKey} />
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="phone" value={phone ?? ""} />
          <input type="hidden" name="purchasedProduct" value={purchasedProduct} />
          <input type="hidden" name="rating" value={String(reviewRating)} />
          <input type="hidden" name="commentText" value={commentText} />

          <div className="omb-cta-card omb-cta-card--highlight">
            <p>{calloutText}</p>
            <div className="stack-row">
              <button
                type="button"
                className="button button--primary"
                onClick={handleCopyAndGo}
                disabled={!canUseOutboundButton}
              >
                {outboundButtonLabel}
              </button>
              {copyState === "copied" ? <span className="pill">Text copied</span> : null}
            </div>
          </div>

          {requiresScreenshot ? (
            <div className="field">
              <label htmlFor="omb-screenshot">
                Please upload the screenshot of your comment on the platform{" "}
                <span className="field__required">(Required)</span>
              </label>
              <input
                id="omb-screenshot"
                name="screenshot"
                type="file"
                accept="image/*"
                required
                className="omb-file-input"
                onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || "")}
              />
              <label htmlFor="omb-screenshot" className="omb-file-trigger">
                <span className="button button--secondary">Choose File</span>
                <span className="omb-file-trigger__name">
                  {selectedFileName || "No file selected"}
                </span>
              </label>
            </div>
          ) : null}

          {includeAddress ? (
            <div className="field">
              <label htmlFor="omb-address">
                {addressLabel} <span className="field__required">(Required)</span>
              </label>
              <textarea id="omb-address" name="extraBottleAddress" required />
            </div>
          ) : null}

          <button type="submit" className="button button--primary om-shell__submit">
            {submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
