import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { siteConfig } from "@/lib/site-config";
import { defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Neatique Beauty",
  description:
    "Learn how Neatique Beauty approaches straightforward skincare shopping, transparent product information, customer support, shipping and returns.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About Neatique Beauty | ${siteConfig.title}`,
    description:
      "A straightforward skincare collection supported by clear product information, direct customer care and practical shopping policies.",
    url: `${siteConfig.url}/about`,
    images: [defaultOgImage]
  }
};

export default function AboutPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">About Neatique</p>
          <h1>Skincare shopping built around clear information and an easier daily routine.</h1>
          <p>
            Neatique Beauty brings together face and body care for hydration, comfort and a
            smoother-looking finish. Each product page is designed to help shoppers compare the
            formula focus, texture, price and routine fit before they buy.
          </p>
          <div className="page-hero__stats">
            <span className="pill">Direct online store</span>
            <span className="pill">Mainland U.S. shipping</span>
            <span className="pill">30-day return support</span>
          </div>
        </div>

        <div className="section cards-3">
          <article className="contact-card">
            <h2>Useful product facts</h2>
            <p>
              We publish product descriptions, prices, availability and customer reviews on the
              relevant product page. Packaging-verified identifiers and ingredient details are
              added only when they can be confirmed.
            </p>
          </article>
          <article className="contact-card">
            <h2>Direct customer care</h2>
            <p>
              Order and product questions are handled through {siteConfig.supportEmail} and the
              contact form, keeping the support route visible and consistent.
            </p>
          </article>
          <article className="contact-card">
            <h2>Clear store policies</h2>
            <p>
              Paid orders are typically processed within one business day. Eligible purchases
              made directly from this website can request return support within 30 days of delivery.
            </p>
          </article>
        </div>

        <div className="stack-row">
          <ButtonLink href="/shop" variant="primary">Explore the collection</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Contact Neatique</ButtonLink>
        </div>
      </div>
    </section>
  );
}
