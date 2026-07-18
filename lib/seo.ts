import type { Metadata } from "next";
import { buildSiteImageUrl } from "@/lib/site-media";
import { siteConfig } from "@/lib/site-config";

export const noIndexRobots: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true
  }
};

export const defaultOgImage = {
  url: buildSiteImageUrl("home", "Signature Brand Campaign.png"),
  width: 800,
  height: 800,
  alt: "Neatique Beauty professional skincare signature campaign image."
};

export function toAbsoluteUrl(path: string) {
  return new URL(path, siteConfig.url).toString();
}
