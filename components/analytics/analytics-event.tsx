"use client";

import { useEffect } from "react";
import type { GoogleAnalyticsParams } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGoogleAnalyticsEvent(eventName: string, params: GoogleAnalyticsParams) {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
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

    if (dedupeKey && storage.getItem(dedupeKey)) {
      return;
    }

    trackGoogleAnalyticsEvent(eventName, JSON.parse(serializedParams) as GoogleAnalyticsParams);

    if (dedupeKey) {
      storage.setItem(dedupeKey, "1");
    }
  }, [dedupeKey, dedupeStorage, eventName, serializedParams]);

  return null;
}
