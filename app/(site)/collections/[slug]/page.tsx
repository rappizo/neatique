import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PostCard } from "@/components/ui/post-card";
import { ProductCard } from "@/components/ui/product-card";
import { COLLECTIONS, getCollection } from "@/lib/collections";
import { getActiveProducts, getPublishedPosts } from "@/lib/queries";
import { defaultOgImage } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);

  if (!collection) {
    return { title: "Collection not found" };
  }

  return {
    title: collection.title,
    description: collection.description,
    keywords: [collection.primaryKeyword, ...collection.secondaryKeywords],
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: `${collection.title} | ${siteConfig.title}`,
      description: collection.description,
      url: `${siteConfig.url}/collections/${collection.slug}`,
      images: [defaultOgImage]
    },
    twitter: {
      card: "summary_large_image",
      title: `${collection.title} | ${siteConfig.title}`,
      description: collection.description,
      images: [defaultOgImage.url]
    }
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getCollection(slug);

  if (!collection) {
    notFound();
  }

  const [allProducts, allPosts] = await Promise.all([getActiveProducts(), getPublishedPosts()]);
  const productMap = new Map(allProducts.map((product) => [product.slug, product]));
  const postMap = new Map(allPosts.map((post) => [post.slug, post]));
  const products = collection.productSlugs.map((productSlug) => productMap.get(productSlug)).filter(Boolean);
  const guides = collection.guideSlugs.map((guideSlug) => postMap.get(guideSlug)).filter(Boolean);
  const pageUrl = `${siteConfig.url}/collections/${collection.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: collection.title,
    description: collection.description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product!.name,
        url: `${siteConfig.url}/shop/${product!.slug}`
      }))
    }
  };

  return (
    <section className="section collection-page">
      <div className="container">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Collections", href: "/collections" },
            { name: collection.shortTitle, href: `/collections/${collection.slug}` }
          ]}
        />

        <div className="page-hero">
          <p className="eyebrow">{collection.primaryKeyword}</p>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
          <div className="page-hero__stats">
            <span className="pill">{products.length} products</span>
            <span className="pill">Texture comparison</span>
            <span className="pill">Simple routine guidance</span>
          </div>
        </div>

        <section className="product-page-section collection-introduction">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Start with the routine role</p>
            <h2>Compare what each texture contributes before adding another step.</h2>
          </div>
          {collection.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>

        <section className="product-page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Choosing guide</p>
            <h2>Find the option that best matches your current routine.</h2>
          </div>
          <div className="cards-3">
            {collection.choosingGuide.map((card) => (
              <article key={card.title} className="panel">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="product-page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Products</p>
            <h2>Compare the collection.</h2>
          </div>
          <div className="product-grid--shop">
            {products.map((product) => <ProductCard key={product!.id} product={product!} />)}
          </div>
        </section>

        <section className="product-page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Routine order</p>
            <h2>Keep the sequence easy to follow.</h2>
          </div>
          <ol className="collection-steps">
            {collection.routineSteps.map((step) => (
              <li key={step.title} className="panel"><h3>{step.title}</h3><p>{step.body}</p></li>
            ))}
          </ol>
        </section>

        {guides.length > 0 ? (
          <section className="product-page-section">
            <div className="section-heading">
              <p className="section-heading__eyebrow">Related guides</p>
              <h2>Read the routine details before you choose.</h2>
            </div>
            <div className="post-grid">
              {guides.map((post) => <PostCard key={post!.id} post={post!} />)}
            </div>
          </section>
        ) : null}

        <section className="product-page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Common questions</p>
            <h2>What to know before changing your routine.</h2>
          </div>
          <div className="story-sections">
            {collection.faqs.map((faq) => (
              <article key={faq.question} className="panel"><h3>{faq.question}</h3><p>{faq.answer}</p></article>
            ))}
          </div>
          <p className="form-note">
            This guide provides general cosmetic information, not medical advice. Follow product
            labels and consult a qualified professional for persistent irritation or a skin condition.
          </p>
        </section>
      </div>
    </section>
  );
}
