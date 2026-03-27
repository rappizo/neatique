import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Read the Neatique Beauty Shipping Policy for order processing, United States delivery, and shipping timing details.",
  alternates: {
    canonical: "/shipping-policy"
  }
};

const sections = [
  {
    title: "Order processing",
    paragraphs: [
      "Neatique Beauty currently ships within the United States only. Orders are typically processed and shipped within 1 business day after payment is successfully completed.",
      "Orders placed on weekends or holidays are processed on the next business day. During launches, promotions, or unusually busy periods, processing may take slightly longer."
    ]
  },
  {
    title: "Shipping updates and delivery",
    paragraphs: [
      "Once your order ships, you will receive a confirmation email with shipment details and available tracking information.",
      "Delivery timelines can vary based on the carrier, destination, weather conditions, and seasonal shipping volume. Processing time and carrier transit time are separate."
    ]
  },
  {
    title: "Address accuracy",
    paragraphs: [
      "Please review your shipping information carefully before completing checkout. Customers are responsible for providing an accurate shipping address, name, and email address.",
      "If an order is returned due to an incomplete or incorrect address, additional shipping fees may apply before the order can be sent again."
    ]
  },
  {
    title: "Shipping limitations",
    paragraphs: [
      "At this time, we do not offer shipping outside the United States. Orders to freight forwarding services, restricted destinations, or addresses we cannot verify may be reviewed or canceled for security reasons.",
      "If you believe there is an issue with your shipment, contact us as soon as possible so we can help review the order."
    ]
  }
] as const;

const highlights = [
  {
    title: "1 business day processing",
    description: "Most paid orders are prepared and shipped within 1 business day."
  },
  {
    title: "United States only",
    description: "The website currently serves customers shipping to addresses in the US."
  },
  {
    title: "Tracking updates",
    description: "Shipping confirmation and tracking details are sent by email after dispatch."
  }
] as const;

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Shipping Policy"
      title="Fast order handling with most paid orders shipped within 1 business day."
      description="This Shipping Policy explains how Neatique processes United States orders, how shipment timing works, and what customers should know before placing an order."
      stats={["Ships within the United States", "Most orders leave in 1 business day", "Tracking sent by email"]}
      sections={[...sections]}
      highlights={[...highlights]}
    />
  );
}
