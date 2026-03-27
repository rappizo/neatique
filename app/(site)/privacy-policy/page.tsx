import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the Neatique Beauty Privacy Policy for information about how we collect, use, and protect customer information.",
  alternates: {
    canonical: "/privacy-policy"
  }
};

const sections = [
  {
    title: "Information we collect",
    paragraphs: [
      "We collect the information you share with us when you place an order, create an account, subscribe to email updates, submit a contact form, leave a review, or communicate with customer support.",
      "This information may include your name, email address, phone number, shipping address, billing address, order details, and any message or review content you choose to provide."
    ]
  },
  {
    title: "How we use your information",
    paragraphs: [
      "We use customer information to process orders, arrange payment, provide shipping updates, respond to support requests, improve the shopping experience, and maintain your account, rewards, and order history.",
      "If you subscribe to marketing emails, we may also use your email address to send product updates, launch announcements, routine tips, and promotional offers."
    ],
    bullets: [
      "To process and fulfill purchases",
      "To send order confirmations and service emails",
      "To respond to customer care requests",
      "To improve site experience, content, and product pages",
      "To deliver marketing emails when you opt in"
    ]
  },
  {
    title: "Payments, analytics, and service providers",
    paragraphs: [
      "Payments on Neatique Beauty are processed through secure third-party providers such as Stripe. We do not store full payment card details on our own servers.",
      "We may also use trusted tools for website analytics, order management, email delivery, and customer communication. These providers only receive the information needed to perform their services for us."
    ]
  },
  {
    title: "Cookies and tracking",
    paragraphs: [
      "We may use cookies and similar technologies to remember cart activity, keep your session active, understand site performance, and improve the browsing experience.",
      "You can control cookies through your browser settings, although some features of the website may work less smoothly if certain cookies are disabled."
    ]
  },
  {
    title: "Your choices and contact",
    paragraphs: [
      "You may unsubscribe from marketing emails at any time by using the unsubscribe link in the email. You may also contact us if you would like us to update or delete information connected to your account, subject to legal and operational requirements.",
      "For privacy questions, email us through our contact page and we will do our best to help promptly."
    ]
  }
] as const;

const highlights = [
  {
    title: "Secure checkout",
    description: "Payments are processed through secure third-party payment providers."
  },
  {
    title: "Customer support",
    description: "We use your details to support orders, shipping updates, and customer care."
  },
  {
    title: "Marketing opt-in",
    description: "Promotional emails are only sent when you subscribe or otherwise opt in."
  }
] as const;

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy Policy"
      title="How Neatique collects, uses, and protects customer information."
      description="This Privacy Policy explains what information we collect on Neatique Beauty, how that information supports your orders and account experience, and the choices available to you."
      stats={["Applies to site visitors and customers", "Secure payment processing", "Support available by contact request"]}
      sections={[...sections]}
      highlights={[...highlights]}
    />
  );
}
