import type { Metadata } from "next";
import { ProductCard } from "@/components/ui/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getActiveProducts } from "@/lib/queries";
import { defaultOgImage } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import Link from "next/link";
import { COLLECTIONS } from "@/lib/collections";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the full Neatique collection of bright, modern skincare essentials.",
  alternates: {
    canonical: "/shop"
  },
  keywords: [
    "Neatique shop",
    "buy KIT9 serum",
    "buy PDRN cream",
    "buy PDRN serum",
    "buy snail mucin cream",
    "buy snail mucin serum",
    "professional skincare shop"
  ],
  openGraph: {
    title: `Shop | ${siteConfig.title}`,
    description: "Browse the full Neatique collection of bright, modern skincare essentials.",
    url: `${siteConfig.url}/shop`,
    images: [defaultOgImage]
  },
  twitter: {
    card: "summary_large_image",
    title: `Shop | ${siteConfig.title}`,
    description: "Browse the full Neatique collection of bright, modern skincare essentials.",
    images: [defaultOgImage.url]
  }
};

export default async function ShopPage() {
  const products = await getActiveProducts();

  return (
    <section className="section">
      <div className="container">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop", href: "/shop" }]} />
        <div className="page-hero">
          <p className="eyebrow">Shop Neatique</p>
          <h1>Skincare made to feel soft, elegant, and easy to love every day.</h1>
          <p>
            Explore the Neatique collection of tone serums, PDRN, and Snail Mucin essentials,
            created for smooth texture, comfortable hydration, and a healthy-looking glow.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{products.length} products</span>
            <span className="pill">United States only</span>
            <span className="pill">Glow-focused routines</span>
          </div>
        </div>
        <div className="section collection-directory collection-directory--compact">
          {COLLECTIONS.map((collection) => (
            <article key={collection.slug} className="panel collection-directory__card">
              <h2>{collection.shortTitle}</h2>
              <p>{collection.description}</p>
              <Link href={`/collections/${collection.slug}`} className="link-inline">
                Compare this collection
              </Link>
            </article>
          ))}
        </div>
        <div className="section">
          <SectionHeading
            eyebrow="Collection"
            title="Choose the texture and finish that best fits your routine."
            description="Whether you love a silky serum, a comforting cream, or an extra dewy finish, the collection is designed to make daily skincare feel simple and beautiful."
          />
          <div className="product-grid--shop">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
