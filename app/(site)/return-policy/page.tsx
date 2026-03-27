import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";

export const metadata: Metadata = {
  title: "Return Policy",
  description:
    "Read the Neatique Beauty Return Policy for our 30 Days Money Back promise and return support details.",
  alternates: {
    canonical: "/return-policy"
  }
};

const sections = [
  {
    title: "30 Days Money Back",
    paragraphs: [
      "Neatique Beauty offers a 30 Days Money Back policy for eligible orders purchased directly from our website. If you are not satisfied, contact us within 30 days of delivery and our team will review the request.",
      "To help us process your request smoothly, please include your order number, the email used at checkout, and a short note about the issue."
    ]
  },
  {
    title: "How returns and refunds are handled",
    paragraphs: [
      "Once a return or refund request is approved, we will share the next steps by email. Depending on the situation, we may ask for additional order details or photos before completing the review.",
      "Approved refunds are generally returned to the original payment method. Your bank or card provider may take additional time to post the refund after it is issued."
    ]
  },
  {
    title: "Items that may not qualify",
    paragraphs: [
      "We reserve the right to refuse requests that fall outside the 30-day window, show signs of misuse, involve abuse of the return policy, or relate to orders not purchased directly from Neatique Beauty.",
      "Shipping fees, if applicable, may not be refundable unless the issue was caused by an error on our side."
    ]
  },
  {
    title: "Need return support?",
    paragraphs: [
      "If you need help with a return, refund, or damaged package, contact us through the site contact page as soon as possible.",
      "We want the process to feel straightforward and fair, and our support team will do its best to assist promptly."
    ]
  }
] as const;

const highlights = [
  {
    title: "30-day window",
    description: "Eligible website orders can be reviewed for refund support within 30 days of delivery."
  },
  {
    title: "Direct purchases only",
    description: "The policy applies to items purchased directly from Neatique Beauty."
  },
  {
    title: "Fast support",
    description: "Send your order number and email to help us review the request more quickly."
  }
] as const;

export default function ReturnPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Return Policy"
      title="A 30 Days Money Back policy designed to keep shopping with Neatique confident and easy."
      description="This Return Policy explains the return and refund support available for orders placed directly on Neatique Beauty, including our 30-day money-back window."
      stats={["30 Days Money Back", "Applies to direct website orders", "Support handled by email"]}
      sections={[...sections]}
      highlights={[...highlights]}
    />
  );
}
