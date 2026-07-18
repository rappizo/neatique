"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { GoogleAnalyticsItem } from "@/lib/analytics";
import { trackGoogleAnalyticsEvent } from "@/components/analytics/analytics-event";

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  item?: GoogleAnalyticsItem;
  children: ReactNode;
};

export function TrackedExternalLink({ eventName, item, children, ...props }: TrackedExternalLinkProps) {
  return (
    <a
      {...props}
      onClick={() =>
        trackGoogleAnalyticsEvent(eventName, {
          link_url: props.href,
          outbound: true,
          items: item ? [item] : undefined
        })
      }
    >
      {children}
    </a>
  );
}
