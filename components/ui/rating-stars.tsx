type RatingStarsProps = {
  rating?: number | null;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  showCount?: boolean;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.25 14.983 8.294 21.652 9.263 16.826 13.967 17.965 20.609 12 17.473 6.035 20.609 7.174 13.967 2.348 9.263 9.017 8.294 12 2.25Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RatingStars({
  rating,
  reviewCount,
  size = "sm",
  showValue = true,
  showCount = false
}: RatingStarsProps) {
  const safeRating = Math.max(0, Math.min(5, rating ?? 0));

  return (
    <div className={`rating-stars rating-stars--${size}`}>
      <div className="rating-stars__visual" aria-label={`${safeRating.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => {
          const starFill = Math.max(0, Math.min(1, safeRating - index));

          return (
            <span key={`star-${index}`} className="rating-stars__star">
              <span className="rating-stars__star-track">
                <StarIcon filled={false} />
              </span>
              <span
                className="rating-stars__star-fill"
                style={{ width: `${starFill * 100}%` }}
              >
                <StarIcon filled />
              </span>
            </span>
          );
        })}
      </div>
      {showValue ? <span className="rating-stars__value">{safeRating.toFixed(1)}</span> : null}
      {showCount ? (
        <span className="rating-stars__count">
          {reviewCount ?? 0} review{reviewCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}
