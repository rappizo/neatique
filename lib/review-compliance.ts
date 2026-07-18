import type { ReviewStatus } from "@/lib/types";

export const SYNTHETIC_REVIEW_SOURCE = "AI_GENERATED";

export function isSyntheticReviewSource(source: string | null | undefined) {
  return source === SYNTHETIC_REVIEW_SOURCE;
}

export function getCompliantReviewStatus(
  source: string | null | undefined,
  requestedStatus: ReviewStatus
): ReviewStatus {
  return isSyntheticReviewSource(source) ? "HIDDEN" : requestedStatus;
}

export function canMarkReviewAsVerified(input: {
  source: string | null | undefined;
  orderId: string | null | undefined;
}) {
  return !isSyntheticReviewSource(input.source) && Boolean(input.orderId);
}
