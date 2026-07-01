"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderMatchPlatform } from "@/lib/order-match";
import {
  isFreshOmbClaimProgressSnapshot,
  type OmbClaimProgressSnapshot
} from "@/lib/order-match-progress";

type OmbSelectableProduct = {
  id: string;
  name: string;
  shortName: string;
  amazonAsin: string | null;
};

type OmbClaimStepTwoFormProps = {
  claimId: string;
  platformKey: OrderMatchPlatform;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone: string | null;
  productOptions: OmbSelectableProduct[];
  initialPurchasedProduct?: string | null;
  initialReviewRating?: number | null;
  initialCommentText?: string | null;
  backHref?: string;
  resumeStorageKey?: string;
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
  initialPurchasedProduct,
  initialReviewRating,
  initialCommentText,
  backHref,
  resumeStorageKey,
  eyebrow = "OMB Process / Step 2",
  title = "Tell us what you purchased and how the product felt on your skin.",
  description = "Your order verification from step 1 has already been carried over. Share the product, your rating, and your comments here before we send you to the final step.",
  submitAction = "/api/om2",
  submitLabel = "Continue"
}: OmbClaimStepTwoFormProps) {
  const [selectedProduct, setSelectedProduct] = useState(initialPurchasedProduct ?? "");
  const [rating, setRating] = useState(initialReviewRating ?? 0);
  const [commentText, setCommentText] = useState(initialCommentText ?? "");

  useEffect(() => {
    if (!resumeStorageKey) {
      return;
    }

    try {
      const rawProgress = window.localStorage.getItem(resumeStorageKey);
      const storedProgress = rawProgress ? (JSON.parse(rawProgress) as unknown) : null;

      if (!isFreshOmbClaimProgressSnapshot(storedProgress) || storedProgress.claimId !== claimId) {
        return;
      }

      if (!initialPurchasedProduct && storedProgress.purchasedProduct) {
        setSelectedProduct(storedProgress.purchasedProduct);
      }

      if (!initialReviewRating && storedProgress.reviewRating) {
        setRating(storedProgress.reviewRating);
      }

      if (!initialCommentText && storedProgress.commentText) {
        setCommentText(storedProgress.commentText);
      }
    } catch {
      window.localStorage.removeItem(resumeStorageKey);
    }
  }, [
    claimId,
    initialCommentText,
    initialPurchasedProduct,
    initialReviewRating,
    resumeStorageKey
  ]);

  useEffect(() => {
    if (!resumeStorageKey) {
      return;
    }

    const snapshot: OmbClaimProgressSnapshot = {
      version: 1,
      processKey: "OMB",
      claimId,
      step: "step-2",
      platformKey,
      platformLabel,
      orderId,
      name,
      email,
      phone,
      purchasedProduct: selectedProduct || null,
      reviewRating: rating || null,
      commentText: commentText || null,
      updatedAt: new Date().toISOString()
    };

    try {
      window.localStorage.setItem(resumeStorageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures so the claim form remains usable.
    }
  }, [
    claimId,
    commentText,
    email,
    name,
    orderId,
    phone,
    platformKey,
    platformLabel,
    rating,
    resumeStorageKey,
    selectedProduct
  ]);

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
            <select
              id="purchased-product"
              name="purchasedProduct"
              required
              value={selectedProduct}
              onChange={(event) => setSelectedProduct(event.target.value)}
            >
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
            <textarea
              id="omb-comment"
              name="commentText"
              minLength={10}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              required
            />
            <p className="form-note">Please write at least 10 characters.</p>
          </div>

          <div className="stack-row om-shell__form-actions">
            {backHref ? (
              <Link href={backHref} className="button button--secondary">
                Back to order information
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
