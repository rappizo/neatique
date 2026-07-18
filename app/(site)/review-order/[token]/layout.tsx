import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Review your purchase",
  referrer: "no-referrer",
  robots: noIndexRobots
};

export default function OrderReviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
