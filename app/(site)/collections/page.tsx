import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { COLLECTIONS } from "@/lib/collections";
import { defaultOgImage } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Skincare Collections",
  description:
    "Browse Neatique skincare collections by ingredient focus, texture and routine need, including PDRN, snail mucin, uneven-looking tone and dry-skin hydration.",
  alternates: { canonical: "/collections" },
  openGraph: {
    title: `Skincare Collections | ${siteConfig.title}`,
    description: "Compare Neatique skincare by routine need and product texture.",
    url: `${siteConfig.url}/collections`,
    images: [defaultOgImage]
  }
};

export default function CollectionsPage() {
  return (
    <section className="section">
      <div className="container">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections", href: "/collections" }]} />
        <div className="page-hero">
          <p className="eyebrow">Skincare collections</p>
          <h1>Choose a routine by need, texture and product role.</h1>
          <p>
            These guides group related formulas without treating them as interchangeable. Compare
            the routine step each product fills before deciding what belongs in your routine.
          </p>
        </div>
        <div className="section collection-directory">
          {COLLECTIONS.map((collection) => (
            <article key={collection.slug} className="panel collection-directory__card">
              <p className="eyebrow">{collection.primaryKeyword}</p>
              <h2>{collection.shortTitle}</h2>
              <p>{collection.description}</p>
              <Link href={`/collections/${collection.slug}`} className="button button--secondary">
                Explore {collection.shortTitle}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
