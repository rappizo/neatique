export const ADMIN_UPLOADED_REVIEW_SOURCE = "ADMIN_UPLOAD";
export const ADMIN_UPLOADED_REVIEW_TITLE = "Customer review";
export const ADMIN_UPLOADED_REVIEW_INTERNAL_RATING = 5;

export type ReviewImageUrlResult =
  | { valid: true; value: string | null }
  | { valid: false; value: null };

export function normalizeReviewImageUrl(value: string | null | undefined): ReviewImageUrlResult {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return { valid: true, value: null };
  }

  if (normalized.length > 2048) {
    return { valid: false, value: null };
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, value: null };
    }

    return { valid: true, value: normalized };
  } catch {
    return { valid: false, value: null };
  }
}

export function isAdminUploadedReview(source: string | null | undefined) {
  return source === ADMIN_UPLOADED_REVIEW_SOURCE;
}
