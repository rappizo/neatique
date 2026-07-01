"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OrderMatchPlatform } from "@/lib/order-match";
import {
  isFreshOmbClaimProgressSnapshot,
  type OmbClaimProgressSnapshot
} from "@/lib/order-match-progress";

type OmbClaimStepThreeFormProps = {
  claimId: string;
  platformKey: OrderMatchPlatform;
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
  initialExtraBottleAddress?: string | null;
  backHref?: string;
  resumeStorageKey?: string;
  progressSaveAction?: string;
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
  includeAddress = true,
  initialExtraBottleAddress,
  backHref,
  resumeStorageKey,
  progressSaveAction
}: OmbClaimStepThreeFormProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [extraBottleAddress, setExtraBottleAddress] = useState(initialExtraBottleAddress ?? "");
  const requiresScreenshot = useMemo(() => platformKey !== "amazon", [platformKey]);
  const canUseOutboundButton = Boolean(destinationUrl);

  useEffect(() => {
    if (!resumeStorageKey || initialExtraBottleAddress) {
      return;
    }

    try {
      const rawProgress = window.localStorage.getItem(resumeStorageKey);
      const storedProgress = rawProgress ? (JSON.parse(rawProgress) as unknown) : null;

      if (
        isFreshOmbClaimProgressSnapshot(storedProgress) &&
        storedProgress.claimId === claimId &&
        storedProgress.extraBottleAddress
      ) {
        setExtraBottleAddress(storedProgress.extraBottleAddress);
      }
    } catch {
      window.localStorage.removeItem(resumeStorageKey);
    }
  }, [claimId, initialExtraBottleAddress, resumeStorageKey]);

  const writeProgress = useCallback(
    (nextAddress = extraBottleAddress) => {
      if (!resumeStorageKey) {
        return;
      }

      const snapshot: OmbClaimProgressSnapshot = {
        version: 1,
        processKey: "OMB",
        claimId,
        step: "last-step",
        platformKey,
        platformLabel,
        orderId,
        name,
        email,
        phone,
        purchasedProduct,
        reviewRating,
        commentText,
        extraBottleAddress: nextAddress || null,
        updatedAt: new Date().toISOString()
      };

      try {
        window.localStorage.setItem(resumeStorageKey, JSON.stringify(snapshot));
      } catch {
        // Ignore storage failures so the claim form remains usable.
      }
    },
    [
      claimId,
      commentText,
      email,
      extraBottleAddress,
      name,
      orderId,
      phone,
      platformKey,
      platformLabel,
      purchasedProduct,
      resumeStorageKey,
      reviewRating
    ]
  );

  useEffect(() => {
    writeProgress();
  }, [writeProgress]);

  async function saveProgressToServer() {
    if (!progressSaveAction) {
      return;
    }

    try {
      await fetch(progressSaveAction, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          claimId,
          extraBottleAddress
        }),
        keepalive: true
      });
    } catch (error) {
      console.error("Could not save OMB progress:", error);
    }
  }

  async function handleCopyAndGo() {
    if (!canUseOutboundButton) {
      return;
    }

    writeProgress();
    await saveProgressToServer();

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
              <textarea
                id="omb-address"
                name="extraBottleAddress"
                value={extraBottleAddress}
                onChange={(event) => {
                  setExtraBottleAddress(event.target.value);
                  writeProgress(event.target.value);
                }}
                required
              />
            </div>
          ) : null}

          <div className="stack-row om-shell__form-actions">
            {backHref ? (
              <Link href={backHref} className="button button--secondary">
                Back to product review
              </Link>
            ) : null}
            <button type="submit" className="button button--primary om-shell__submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
