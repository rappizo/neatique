"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";
import { getReviewPath } from "@/lib/review-links";
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
  const canShowMore = visibleCount < reviews.length;

  return (
    <section className="admin-card review-showcase-panel">
      <div className="review-showcase-panel__header">
        <div className="review-showcase-panel__summary">
          <h3>Customer rating</h3>
          <RatingStars
            rating={averageRating}
            reviewCount={reviews.length}
            showCount
            size="lg"
          />
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
              {review.verifiedPurchase ? <span>Verified purchase</span> : null}
              <time dateTime={new Date(review.reviewDate).toISOString()}>{formatDate(review.reviewDate)}</time>
            </div>
            <RatingStars rating={review.rating} size="sm" />
            <h4>{review.title}</h4>
            <p>{review.content}</p>
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
