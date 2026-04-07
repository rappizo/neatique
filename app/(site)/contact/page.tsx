import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { siteConfig } from "@/lib/site-config";
import { defaultOgImage } from "@/lib/seo";

type ContactPageProps = {
  searchParams: Promise<{ sent?: string; status?: string }>;
};

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Neatique for customer care, retail support, and partnership questions.",
  alternates: {
    canonical: "/contact"
  },
  keywords: [
    "contact Neatique",
    "Neatique customer support",
    "skincare order support",
    "Neatique contact page"
  ],
  openGraph: {
    title: `Contact | ${siteConfig.title}`,
    description: "Contact Neatique for customer care, retail support, and partnership questions.",
    url: `${siteConfig.url}/contact`,
    images: [defaultOgImage]
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact | ${siteConfig.title}`,
    description: "Contact Neatique for customer care, retail support, and partnership questions.",
    images: [defaultOgImage.url]
  }
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { sent, status } = await searchParams;

  return (
    <section className="section">
      <div className="container">
        <div className="contact-hero">
          <p className="eyebrow">Contact</p>
          <h1>We are here to help with orders, product questions, and everyday routine advice.</h1>
          <p>
            Reach out if you need help choosing a product, checking an order, or learning how to fit
            Neatique into your current routine.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{siteConfig.supportEmail}</span>
            <span className="pill">{siteConfig.phone}</span>
            <span className="pill">US region support</span>
          </div>
        </div>

        {sent === "1" ? <p className="notice">Your message was received. We will be in touch soon.</p> : null}
        {status === "invalid" ? (
          <p className="notice notice--warning">
            Please double-check your email, subject, and message, then try again.
          </p>
        ) : null}

        <div className="section cards-2">
          <div className="contact-card">
            <h3>Customer & retail support</h3>
            <p>
              Reach out for shipping questions, order support, product guidance, or retail
              inquiries.
            </p>
            <div className="site-footer__contact">
              <span>{siteConfig.supportEmail}</span>
              <span>{siteConfig.phone}</span>
              <span>Monday to Friday, 9 AM to 6 PM PT</span>
            </div>
          </div>
          <div className="contact-card">
            <h3>Send a message</h3>
            <p>
              Tell us what you need and our team will get back to you as soon as possible.
            </p>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
