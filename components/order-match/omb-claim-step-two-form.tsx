"use client";

import { useMemo, useState } from "react";
import {
  getOrderMatchPlatform,
  isHighRating,
  OMB_MIN_COMMENT_LENGTH,
  OMB_PRODUCT_OPTIONS
} from "@/lib/order-match";

type OmbClaimStepTwoFormProps = {
  claimId: string;
  platformKey: string;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone: string | null;
};

export function OmbClaimStepTwoForm({
  claimId,
  platformKey,
  platformLabel,
  orderId,
  name,
  email,
  phone
}: OmbClaimStepTwoFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const platform = useMemo(() => getOrderMatchPlatform(platformKey), [platformKey]);
  const shouldShowClaimFields = isHighRating(rating);

  async function handleCopyAndGo() {
    if (comment.trim().length < OMB_MIN_COMMENT_LENGTH) {
      return;
    }

    try {
      await navigator.clipboard.writeText(comment.trim());
      setCopyState("copied");
    } catch (error) {
      console.error("Could not copy review text:", error);
    }

    if (platform.outboundUrl) {
      window.open(platform.outboundUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="om-shell">
      <div className="om-shell__header">
        <div className="section-heading">
          <p className="section-heading__eyebrow">OMB Process / Step 2</p>
          <h1>Finish your OMB claim with product feedback and delivery details.</h1>
          <p className="section-heading__description">
            Your order verification was carried over from step 1. Complete the product feedback
            form below to finish the OMB process.
          </p>
        </div>
        <div className="page-hero__stats">
          <span className="pill">{platformLabel}</span>
          <span className="pill">Order {orderId}</span>
        </div>
      </div>

      <div className="om-shell__body">
        <form action="/api/om2" method="post" encType="multipart/form-data" className="contact-form">
          <input type="hidden" name="claimId" value={claimId} />
          <input type="hidden" name="platform" value={platformKey} />
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="phone" value={phone ?? ""} />
          <input type="hidden" name="rating" value={rating > 0 ? String(rating) : ""} />

          <div className="field">
            <label htmlFor="purchased-product">
              What did you purchase from us? <span className="field__required">(Required)</span>
            </label>
            <select id="purchased-product" name="purchasedProduct" required defaultValue="">
              <option value="" disabled>
                Select a product
              </option>
              {OMB_PRODUCT_OPTIONS.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              How do you like our product? <span className="field__required">(Required)</span>
            </label>
            <div className="omb-stars" role="radiogroup" aria-label="Product rating">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const active = value <= rating;

                return (
                  <button
                    key={value}
                    type="button"
                    className={`omb-stars__button ${active ? "omb-stars__button--active" : ""}`}
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    aria-pressed={rating === value}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label htmlFor="omb-comment">
              Comments about our product. <span className="field__required">(Required)</span>
            </label>
            <textarea
              id="omb-comment"
              name="commentText"
              minLength={OMB_MIN_COMMENT_LENGTH}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required
            />
            <p className="form-note">Please write at least {OMB_MIN_COMMENT_LENGTH} characters.</p>
          </div>

          {shouldShowClaimFields ? (
            <>
              <div className="omb-cta-card">
                <div>
                  <p className="eyebrow">{platformLabel} review</p>
                  <h3>{platform.outboundButtonLabel}</h3>
                  <p>
                    Use this button to copy your comment text, then continue to the marketplace
                    review page.
                  </p>
                </div>
                <div className="stack-row">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={handleCopyAndGo}
                    disabled={comment.trim().length < OMB_MIN_COMMENT_LENGTH}
                  >
                    {platform.outboundButtonLabel}
                  </button>
                  {copyState === "copied" ? <span className="pill">Text copied</span> : null}
                </div>
              </div>

              <div className="field">
                <label htmlFor="omb-screenshot">
                  Please upload the screenshot of your comment on the platform{" "}
                  <span className="field__required">(Required)</span>
                </label>
                <input id="omb-screenshot" name="screenshot" type="file" accept="image/*" required />
                <p className="form-note">
                  Upload a JPG, PNG, WEBP, or AVIF image. Files must be under 15MB.
                </p>
              </div>

              <div className="field">
                <label htmlFor="omb-address">
                  Leave the address for an extra bottle{" "}
                  <span className="field__required">(Required)</span>
                </label>
                <textarea id="omb-address" name="extraBottleAddress" required />
              </div>
            </>
          ) : null}

          <button type="submit" className="button button--primary om-shell__submit">
            Submit OMB claim
          </button>
        </form>
      </div>
    </section>
  );
}
