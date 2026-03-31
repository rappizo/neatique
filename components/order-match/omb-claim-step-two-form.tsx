"use client";

import { useState } from "react";

type OmbSelectableProduct = {
  id: string;
  name: string;
  shortName: string;
  amazonAsin: string | null;
};

type OmbClaimStepTwoFormProps = {
  claimId: string;
  platformKey: string;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone: string | null;
  productOptions: OmbSelectableProduct[];
  eyebrow?: string;
  title?: string;
  description?: string;
  submitAction?: string;
  submitLabel?: string;
};

export function OmbClaimStepTwoForm({
  claimId,
  platformKey,
  platformLabel,
  orderId,
  name,
  email,
  phone,
  productOptions,
  eyebrow = "OMB Process / Step 2",
  title = "Tell us what you purchased and how the product felt on your skin.",
  description = "Your order verification from step 1 has already been carried over. Share the product, your rating, and your comments here before we send you to the final step.",
  submitAction = "/api/om2",
  submitLabel = "Continue"
}: OmbClaimStepTwoFormProps) {
  const [rating, setRating] = useState(0);

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
        </div>
      </div>

      <div className="om-shell__body">
        <form action={submitAction} method="post" className="contact-form">
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
              {productOptions.map((product) => (
                <option key={product.id} value={product.shortName}>
                  {product.shortName}
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
                    {"\u2605"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label htmlFor="omb-comment">
              Comments about our product. <span className="field__required">(Required)</span>
            </label>
            <textarea id="omb-comment" name="commentText" minLength={10} required />
            <p className="form-note">Please write at least 10 characters.</p>
          </div>

          <button type="submit" className="button button--primary om-shell__submit">
            {submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
