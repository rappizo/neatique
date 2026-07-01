import type { OrderMatchPlatform } from "@/lib/order-match";

export const OMB_CLAIM_PROGRESS_STORAGE_KEY = "neatique:omb-claim-progress";
export const OMB_CLAIM_PROGRESS_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export type OmbClaimProgressStep = "step-2" | "last-step";

export type OmbClaimProgressSnapshot = {
  version: 1;
  processKey: "OMB";
  claimId: string;
  step: OmbClaimProgressStep;
  platformKey: OrderMatchPlatform;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone?: string | null;
  purchasedProduct?: string | null;
  reviewRating?: number | null;
  commentText?: string | null;
  extraBottleAddress?: string | null;
  updatedAt: string;
};

type OmbClaimResumeSource = {
  id: string;
  purchasedProduct?: string | null;
  reviewRating?: number | null;
  commentText?: string | null;
  completedAt?: Date | string | null;
};

function isProgressStep(value: unknown): value is OmbClaimProgressStep {
  return value === "step-2" || value === "last-step";
}

function isOrderMatchPlatformKey(value: unknown): value is OrderMatchPlatform {
  return value === "amazon" || value === "tiktok" || value === "walmart";
}

export function isFreshOmbClaimProgressSnapshot(
  value: unknown,
  now = Date.now()
): value is OmbClaimProgressSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<OmbClaimProgressSnapshot>;
  const updatedAt = candidate.updatedAt ? Date.parse(candidate.updatedAt) : Number.NaN;

  return (
    candidate.version === 1 &&
    candidate.processKey === "OMB" &&
    typeof candidate.claimId === "string" &&
    candidate.claimId.length > 0 &&
    isProgressStep(candidate.step) &&
    isOrderMatchPlatformKey(candidate.platformKey) &&
    typeof candidate.platformLabel === "string" &&
    typeof candidate.orderId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    Number.isFinite(updatedAt) &&
    now - updatedAt <= OMB_CLAIM_PROGRESS_MAX_AGE_MS
  );
}

export function buildOmbClaimProgressHref(snapshot: Pick<OmbClaimProgressSnapshot, "claimId" | "step">) {
  return snapshot.step === "last-step"
    ? `/om3?claim=${encodeURIComponent(snapshot.claimId)}`
    : `/om2?claim=${encodeURIComponent(snapshot.claimId)}`;
}

export function getOmbClaimResumePath(claim: OmbClaimResumeSource) {
  if (claim.completedAt) {
    return `/om2/thank-you?claim=${encodeURIComponent(claim.id)}`;
  }

  if (claim.purchasedProduct && claim.reviewRating && claim.commentText) {
    return claim.reviewRating >= 4
      ? `/om3?claim=${encodeURIComponent(claim.id)}`
      : `/om2/thank-you?claim=${encodeURIComponent(claim.id)}`;
  }

  return `/om2?claim=${encodeURIComponent(claim.id)}`;
}
