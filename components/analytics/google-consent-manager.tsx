"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  type AnalyticsConsent
} from "@/lib/analytics-consent";

type GoogleConsentManagerProps = {
  tagId: string;
};

function ensureGoogleQueue() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
}

function loadGoogleAnalytics(tagId: string) {
  ensureGoogleQueue();

  if (!document.querySelector(`script[data-neatique-ga="${tagId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
    script.dataset.neatiqueGa = tagId;
    document.head.appendChild(script);
  }

  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });
  window.gtag?.("js", new Date());
  window.gtag?.("config", tagId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
}

export function GoogleConsentManager({ tagId }: GoogleConsentManagerProps) {
  const [choice, setChoice] = useState<AnalyticsConsent | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    ensureGoogleQueue();
    window.gtag?.("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500
    });

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in hardened browser modes; analytics stays denied.
    }
    if (stored === "granted" || stored === "denied") {
      setChoice(stored);
      if (stored === "granted") {
        loadGoogleAnalytics(tagId);
      }
      return;
    }

    setShowPanel(true);
  }, [tagId]);

  function saveChoice(nextChoice: AnalyticsConsent) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextChoice);
    } catch {
      // Keep the choice for this page even when persistent storage is unavailable.
    }
    setChoice(nextChoice);
    setShowPanel(false);

    if (nextChoice === "granted") {
      loadGoogleAnalytics(tagId);
    } else {
      ensureGoogleQueue();
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
  }

  return (
    <>
      {showPanel ? (
        <aside className="analytics-consent" role="dialog" aria-label="Analytics privacy choices">
          <div>
            <strong>Help us improve Neatique</strong>
            <p>
              We use optional Google Analytics to understand site performance. Analytics stays off
              unless you accept it; advertising storage remains disabled.
            </p>
          </div>
          <div className="analytics-consent__actions">
            <button type="button" className="button button--primary" onClick={() => saveChoice("granted")}>
              Accept analytics
            </button>
            <button type="button" className="button button--secondary" onClick={() => saveChoice("denied")}>
              Decline
            </button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          className="analytics-consent-trigger"
          onClick={() => setShowPanel(true)}
          aria-label={`Open privacy choices. Analytics is ${choice === "granted" ? "on" : "off"}.`}
        >
          Privacy choices
        </button>
      )}
    </>
  );
}
