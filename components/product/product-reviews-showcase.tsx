"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";
import { INCENTIVIZED_REVIEW_LABEL } from "@/lib/incentivized-review-plan";
import { getReviewPath } from "@/lib/review-links";
import { isAdminUploadedReview } from "@/lib/review-upload";
import type { ProductReviewRecord } from "@/lib/types";

type ProductReviewsShowcaseProps = {
  reviews: ProductReviewRecord[];
  averageRating: number | null | undefined;
  initialCount?: number;
  increment?: number;
};

export function ProductReviewsShowcase({
  reviews,
  averageRating,
  initialCount = 24,
  increment = 12
}: ProductReviewsShowcaseProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleReviews = useMemo(() => reviews.slice(0, visibleCount), [reviews, visibleCount]);
  const ratedReviewCount = useMemo(
    () => reviews.filter((review) => review.hasRating).length,
    [reviews]
  );
  const canShowMore = visibleCount < reviews.length;

  return (
    <section className="admin-card review-showcase-panel">
      <div className="review-showcase-panel__header">
        <div className="review-showcase-panel__summary">
          <h3>Customer rating</h3>
          {ratedReviewCount > 0 ? (
            <RatingStars
              rating={averageRating}
              reviewCount={ratedReviewCount}
              showCount
              size="lg"
            />
          ) : reviews.length > 0 ? (
            <p>{reviews.length} customer review{reviews.length === 1 ? "" : "s"}</p>
          ) : null}
          <p>
            {reviews.length > 0
              ? "A mix of short and detailed feedback from shoppers who already added this formula to their routine."
              : "No reviews have been published yet."}
          </p>
        </div>
      </div>

      <div className="review-showcase">
        {visibleReviews.map((review) => (
          <Link
            key={review.id}
            href={getReviewPath(review.id)}
            className="review-card review-card--link"
            aria-label={`Open review from ${review.displayName} for ${review.productName ?? "this product"}`}
          >
            <div className="review-card__meta">
              <strong>{review.displayName}</strong>
              {review.purchaseChannel ? <span>Purchased via {review.purchaseChannel}</span> : null}
              {review.verifiedPurchase ? <span>Verified purchase</span> : null}
              {review.incentivizedReview ? (
                <span className="review-disclosure-badge">{INCENTIVIZED_REVIEW_LABEL}</span>
              ) : null}
              <time dateTime={new Date(review.reviewDate).toISOString()}>{formatDate(review.reviewDate)}</time>
            </div>
            {review.hasRating ? <RatingStars rating={review.rating} size="sm" /> : null}
            {!isAdminUploadedReview(review.source) ? <h4>{review.title}</h4> : null}
            <p>{review.content}</p>
            {review.reviewImageUrl ? (
              <span className="review-card__image-wrap">
                {/* Review images can be hosted by the purchase channel, so they cannot use a fixed Next.js image host allowlist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="review-card__image"
                  src={review.reviewImageUrl}
                  alt={`Review shared by ${review.displayName}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {canShowMore ? (
        <div className="review-showcase__footer">
          <p>
            Showing {visibleReviews.length} of {reviews.length} reviews
          </p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setVisibleCount((current) => current + increment)}
          >
            View More
          </button>
        </div>
      ) : reviews.length > 0 ? (
        <div className="review-showcase__footer">
          <p>Showing all {reviews.length} reviews</p>
        </div>
      ) : null}
    </section>
  );
}
