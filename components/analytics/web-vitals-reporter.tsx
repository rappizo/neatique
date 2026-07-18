"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackGoogleAnalyticsEvent } from "@/components/analytics/analytics-event";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    trackGoogleAnalyticsEvent("web_vitals", {
      metric_id: metric.id,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      non_interaction: true
    });
  });

  return null;
}
