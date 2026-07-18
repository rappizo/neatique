-- Synthetic consumer reviews must never be public, participate in aggregate
-- ratings, or carry a verified-purchase label.
UPDATE "ProductReview"
SET
  "status" = 'HIDDEN',
  "verifiedPurchase" = false,
  "publishedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "source" = 'AI_GENERATED';
