"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { GoogleAnalyticsItem } from "@/lib/analytics";
import { trackGoogleAnalyticsEvent } from "@/components/analytics/analytics-event";

type TrackedProductLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  item: GoogleAnalyticsItem;
  children: ReactNode;
};

export function TrackedProductLink({ href, item, children, ...props }: TrackedProductLinkProps) {
  return (
    <Link
      href={href}
      {...props}
      onClick={() =>
        trackGoogleAnalyticsEvent("select_item", {
          item_list_id: item.item_list_id,
          item_list_name: item.item_list_name,
          items: [item]
        })
      }
    >
      {children}
    </Link>
  );
}
