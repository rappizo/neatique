import { siteConfig } from "@/lib/site-config";

export function getReviewPath(reviewId: string) {
  return `/reviews/${encodeURIComponent(reviewId)}`;
}

export function getReviewUrl(reviewId: string) {
  return new URL(getReviewPath(reviewId), siteConfig.url).toString();
}
