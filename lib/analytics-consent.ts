export const ANALYTICS_CONSENT_STORAGE_KEY = "neatique-analytics-consent-v1";

export type AnalyticsConsent = "granted" | "denied";

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}
