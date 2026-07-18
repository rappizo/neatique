"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { submitProductReviewAction } from "@/app/(site)/account/actions";

type Eligibility = {
  signedIn: boolean;
  eligible: boolean;
};

type ProductReviewSubmissionProps = {
  productId: string;
  productSlug: string;
};

export function ProductReviewSubmission({ productId, productSlug }: ProductReviewSubmissionProps) {
  const searchParams = useSearchParams();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/account/review-eligibility?productId=${encodeURIComponent(productId)}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: Eligibility | null) => setEligibility(result || { signedIn: false, eligible: false }))
      .catch(() => setEligibility({ signedIn: false, eligible: false }));

    return () => controller.abort();
  }, [productId]);

  return (
    <>
      {searchParams.get("review") === "submitted" ? (
        <p className="notice">Your review was submitted and is waiting for approval.</p>
      ) : null}
      {searchParams.get("error") === "review-not-eligible" ? (
        <p className="notice">Only customers with a completed purchase can review this product.</p>
      ) : null}

      <section className="admin-form review-form-panel">
        <h2>Leave a review</h2>
        {!eligibility ? <p>Checking purchase eligibility…</p> : null}
        {eligibility?.eligible ? (
          <form action={submitProductReviewAction}>
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="productSlug" value={productSlug} />
            <div className="field">
              <label htmlFor="rating">Rating</label>
              <select id="rating" name="rating" defaultValue="5">
                <option value="5">5</option><option value="4">4</option><option value="3">3</option>
                <option value="2">2</option><option value="1">1</option>
              </select>
            </div>
            <div className="field"><label htmlFor="review-title">Review title</label><input id="review-title" name="title" required /></div>
            <div className="field"><label htmlFor="review-content">Your review</label><textarea id="review-content" name="content" required /></div>
            <button type="submit" className="button button--primary">Submit review</button>
          </form>
        ) : null}
        {eligibility && !eligibility.eligible ? (
          eligibility.signedIn ? (
            <p>Review submission becomes available after you complete a purchase.</p>
          ) : (
            <p><Link href="/account/login" className="link-inline">Sign in</Link> to check review eligibility for your purchases.</p>
          )
        ) : null}
      </section>
    </>
  );
}
