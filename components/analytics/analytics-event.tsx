"use client";

import { useEffect } from "react";
import type { GoogleAnalyticsParams } from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGoogleAnalyticsEvent(eventName: string, params: GoogleAnalyticsParams) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) {
    return false;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
  return true;
}

type AnalyticsEventProps = {
  eventName: string;
  params: GoogleAnalyticsParams;
  dedupeKey?: string;
  dedupeStorage?: "session" | "local";
};

export function AnalyticsEvent({
  eventName,
  params,
  dedupeKey,
  dedupeStorage = "session"
}: AnalyticsEventProps) {
  const serializedParams = JSON.stringify(params);

  useEffect(() => {
    const storage = dedupeStorage === "local" ? window.localStorage : window.sessionStorage;

    if (dedupeKey) {
      try {
        if (storage.getItem(dedupeKey)) {
          return;
        }
      } catch {
        // Analytics consent checks still protect the event when storage is unavailable.
      }
    }

    const tracked = trackGoogleAnalyticsEvent(
      eventName,
      JSON.parse(serializedParams) as GoogleAnalyticsParams
    );

    if (dedupeKey && tracked) {
      try {
        storage.setItem(dedupeKey, "1");
      } catch {
        // Do not fail the page when browser privacy settings block storage.
      }
    }
  }, [dedupeKey, dedupeStorage, eventName, serializedParams]);

  return null;
}
