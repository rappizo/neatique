import type { Metadata } from "next";
import { Suspense, type CSSProperties } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { addToCartAction } from "@/app/(site)/cart/actions";
import { AnalyticsEvent } from "@/components/analytics/analytics-event";
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import { ProductCustomerVoiceSlider } from "@/components/product/product-customer-voice-slider";
import { ProductContentFlow } from "@/components/product/product-content-flow";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductReviewsShowcase } from "@/components/product/product-reviews-showcase";
import { ProductReviewSubmission } from "@/components/product/product-review-submission";
import {
  ProductFaqSection,
  ProductRelatedProductsSection,
  ProductRoutineSection,
  ProductTextureVideoSection,
  ProductTransparencySection
} from "@/components/product/product-transparency-sections";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { AiGeneratedPersonBadge } from "@/components/ui/ai-generated-person-badge";
import { ButtonLink } from "@/components/ui/button-link";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatCurrency, formatDate, getSavingsCents } from "@/lib/format";
import {
  pdrnCreamCustomerVoiceVideos,
  pdrnCreamEditorialSections,
  pdrnCreamHighlightCards,
  pdrnCreamRoutineContent,
  pdrnCreamTextureGallery
} from "@/lib/pdrn-cream-page";
import {
  pdrnSerumBenefitCards,
  pdrnSerumEditorialSections,
  pdrnSerumFaqs,
  pdrnSerumGallery,
  pdrnSerumHeroCards,
  pdrnSerumIngredientCards,
} from "@/lib/pdrn-serum-page";
import { getProductStory } from "@/lib/product-content";
import { getProductSeo } from "@/lib/product-seo";
import { selectRelatedProducts } from "@/lib/product-transparency";
import { toGoogleAnalyticsItem } from "@/lib/analytics";
import {
  buildProductOfferSchema,
  buildVerifiedProductIdentifiers,
  merchantReturnPolicy
} from "@/lib/commerce-schema";
import { nadSerumCustomerVoiceVideos } from "@/lib/nad-serum-page";
import {
  getActiveProducts,
  getProductBySlug,
  getPublishedPosts,
  getPublishedReviewsByProductId
} from "@/lib/queries";
import { toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { isLocalProductMediaUrl } from "@/lib/media-url";
import { getCollectionsForProduct } from "@/lib/collections";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((product) => ({ slug: product.slug }));
}

type LandingImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
};

function LandingImage({ src, alt, width, height, sizes, className }: LandingImageProps) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        className={className}
      />
      <AiGeneratedPersonBadge src={src} />
    </>
  );
}

function StoryBody({ body }: { body: string | string[] }) {
  const paragraphs = Array.isArray(body) ? body : [body];

  return (
    <div className="story-body">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

type ProductStory = ReturnType<typeof getProductStory>;

function ProductVisualStory({ story }: { story: ProductStory }) {
  const detailImages = story.detailImages ?? [];
  const visualSections = story.sections.slice(0, detailImages.length);

  if (detailImages.length === 0) {
    return null;
  }

  return (
    <section className="product-page-section product-page-section--centered product-detail-story-section product-visual-story-section">
      <div className="section-heading">
        <p className="section-heading__eyebrow">Formula & texture</p>
        <h2>See the formula, texture and routine fit at a glance.</h2>
        <p className="section-heading__description">
          Product visuals and concise guidance make each key detail easier to understand before
          you choose a routine step.
        </p>
      </div>
      <div className="story-home-sections">
        {detailImages.map((image, index) => {
          const section = visualSections[index];

          if (!section) {
            return null;
          }

          const detailLabel = section.eyebrow ?? "Key highlight";
          const imageWidth = image.width ?? 1344;
          const imageHeight = image.height ?? 2016;
          const requestedMediaWidth = image.mediaWidth ?? "466.67px";
          const mediaWidth = `min(${requestedMediaWidth}, 560px)`;
          const mediaStyle: CSSProperties = {
            aspectRatio: image.aspectRatio ?? "2 / 3",
            height: "auto",
            justifySelf: "center",
            maxHeight: image.maxHeight ?? "700px",
            maxWidth: mediaWidth,
            width: "100%"
          };
          const sectionStyle = {
            "--story-detail-media-width": mediaWidth
          } as CSSProperties;

          return (
            <article
              key={`${section.title}-${image.src}`}
              className={`story-home-section ${
                index % 2 === 1 ? "story-home-section--reverse" : ""
              }`}
              style={sectionStyle}
            >
              <div className="story-home-section__copy">
                <span className="story-home-section__eyebrow">{detailLabel}</span>
                <h3>{section.title}</h3>
                <StoryBody body={section.body} />
              </div>
              <figure className="story-home-section__media" style={mediaStyle}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={imageWidth}
                  height={imageHeight}
                  sizes="(max-width: 720px) 100vw, (max-width: 1080px) 92vw, 44vw"
                  quality={75}
                  unoptimized={
                    isLocalProductMediaUrl(image.src) ||
                    image.src.startsWith("/product-description/")
                  }
                  className="story-home-section__image"
                />
                <AiGeneratedPersonBadge src={image.src} />
                {image.caption ? (
                  <figcaption className="story-home-section__caption">
                    {image.caption}
                  </figcaption>
                ) : null}
              </figure>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductDetailsStory({ story }: { story: ProductStory }) {
  const detailImages = story.detailImages ?? [];
  const detailSections =
    detailImages.length > 0 ? story.sections.slice(detailImages.length) : story.sections;
  const iconHighlights = story.iconHighlights ?? [];

  if (detailSections.length === 0 && iconHighlights.length === 0) {
    return null;
  }

  return (
    <section className="product-page-section product-page-section--centered product-detail-copy-section">
      <div className="section-heading">
        <p className="section-heading__eyebrow">Product details</p>
        <h2>Everything you may want to know before adding it to your routine.</h2>
        <p className="section-heading__description">
          Review the formula story, intended skin feel, use guidance and packaging details in one
          clear place.
        </p>
      </div>
      <div className="story-home-wrap">
        {iconHighlights.length > 0 ? (
          <div className="story-icon-grid">
            {iconHighlights.map((highlight) => (
              <article key={highlight.title} className="story-icon-card">
                <span className="story-icon-card__mark">{highlight.label}</span>
                <div>
                  <h3>{highlight.title}</h3>
                  <p>{highlight.body}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {detailSections.length > 0 ? (
          <div className="story-copy-grid">
            {detailSections.map((section) => (
              <article key={section.title} className="story-copy-card">
                <h3>{section.title}</h3>
                <StoryBody body={section.body} />
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function buildAmazonProductUrl(asin: string | null) {
  const normalizedAsin = String(asin || "").trim();
  return normalizedAsin ? `https://www.amazon.com/dp/${encodeURIComponent(normalizedAsin)}` : null;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found"
    };
  }

  const absoluteImageUrl = toAbsoluteUrl(product.imageUrl);
  const seo = getProductSeo(product);
  const { title, description } = seo;

  if (product.slug === "bee-venom-body-cream") {
    return {
      title,
      description,
      keywords: [
        "bee venom body cream",
        "bee venom cream",
        "moisturizing body cream",
        "body cream for dry rough areas",
        "hyaluronic acid body cream",
        "body cream for elbows and knees",
        "non greasy body cream",
        "buy bee venom body cream"
      ],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  if (product.slug === "pdrn-cleanser") {
    return {
      title,
      description,
      keywords: [
        "PDRN cleanser",
        "PDRN Pink cleanser",
        "niacinamide cleanser",
        "whip cleanser",
        "pink foam cleanser",
        "daily facial cleanser",
        "cleanser without tight feeling",
        "buy PDRN cleanser"
      ],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  if (product.slug === "nad-face-cream") {
    return {
      title,
      description,
      keywords: [
        "NAD+ face cream",
        "8+ NAD+ cream",
        "multi active face cream",
        "niacinamide face cream",
        "alpha arbutin cream",
        "hyaluronic acid ceramide cream",
        "face and neck cream",
        "buy NAD+ face cream"
      ],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  if (product.slug === "pdrn-cream") {
    return {
      title,
      description,
      keywords: [seo.primaryKeyword, ...seo.secondaryKeywords],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  if (product.slug === "pdrn-serum") {
    return {
      title,
      description,
      keywords: [seo.primaryKeyword, ...seo.secondaryKeywords],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  if (product.slug === "nad-collagen-peptide-serum") {
    return {
      title,
      description,
      keywords: [
        "NAD+ collagen peptide serum",
        "NAD serum",
        "collagen peptide serum",
        "peptide serum",
        "niacinamide hyaluronic acid serum",
        "firm-looking serum",
        "AM PM serum routine",
        "buy NAD+ collagen peptide serum"
      ],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  if (product.slug === "tnv3-tranexamic-nicotinamide-serum") {
    return {
      title,
      description,
      keywords: [seo.primaryKeyword, ...seo.secondaryKeywords],
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${title} | ${siteConfig.title}`,
        description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [
          {
            url: absoluteImageUrl,
            alt: product.name
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteConfig.title}`,
        description,
        images: [absoluteImageUrl]
      }
    };
  }

  return {
    title,
    description,
    keywords: [seo.primaryKeyword, ...seo.secondaryKeywords],
    alternates: {
      canonical: `/shop/${product.slug}`
    },
    openGraph: {
      title: `${title} | ${siteConfig.title}`,
      description,
      url: `${siteConfig.url}/shop/${product.slug}`,
      images: [
        {
          url: absoluteImageUrl,
          alt: product.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.title}`,
      description,
      images: [absoluteImageUrl]
    }
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [reviews, allPosts, allProducts] = await Promise.all([
    getPublishedReviewsByProductId(product.id),
    getPublishedPosts(),
    getActiveProducts()
  ]);
  const ratedReviewCount = reviews.filter((review) => review.hasRating).length;

  const story = getProductStory(product.slug);
  const storyDetailImages = story.detailImages ?? [];
  const gallery = product.galleryImages.length > 0 ? product.galleryImages : story.gallery;
  const displayGallery = gallery.length > 0 ? gallery : [product.imageUrl];
  const structuredProductImages = Array.from(
    new Set([...displayGallery, ...storyDetailImages.map((image) => image.src)])
  )
    .slice(0, 12)
    .map((image) => new URL(image, siteConfig.url).toString());
  const productCollections = getCollectionsForProduct(product.slug);
  const relatedGuideSlugs = new Set(productCollections.flatMap((collection) => collection.guideSlugs));
  const relatedGuides = allPosts.filter((post) => relatedGuideSlugs.has(post.slug)).slice(0, 3);
  const relatedProductSlugs = new Set(
    productCollections.flatMap((collection) => [
      ...collection.productSlugs,
      ...(collection.contextProductSlugs || [])
    ])
  );
  relatedProductSlugs.delete(product.slug);
  const relatedProducts = selectRelatedProducts(product, allProducts, relatedProductSlugs, 4);
  const savingsCents = getSavingsCents(product.compareAtPriceCents, product.priceCents);
  const activePriceValidUntil =
    product.priceValidUntil && product.priceValidUntil.getTime() > Date.now()
      ? product.priceValidUntil
      : null;
  const isPdrnCream = product.slug === "pdrn-cream";
  const isPdrnSerum = product.slug === "pdrn-serum";
  const isNadSerum = product.slug === "nad-collagen-peptide-serum";
  const amazonProductUrl = buildAmazonProductUrl(product.amazonAsin);
  const seoDescription = getProductSeo(product).description;
  const analyticsItem = toGoogleAnalyticsItem(product);
  const verifiedIdentifiers = buildVerifiedProductIdentifiers(product);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${siteConfig.url}/shop/${product.slug}#product`,
        name: product.name,
        description: seoDescription,
        sku: product.productCode,
        image: structuredProductImages,
        brand: {
          "@type": "Brand",
          name: siteConfig.name
        },
        manufacturer: {
          "@type": "Organization",
          "@id": `${siteConfig.url}/#organization`,
          name: siteConfig.name
        },
        ...verifiedIdentifiers,
        ...(product.netContent ? { size: product.netContent } : {}),
        ...(product.countryOfOrigin === "CN"
          ? { countryOfOrigin: { "@type": "Country", name: "China" } }
          : {}),
        offers: buildProductOfferSchema(product),
        ...(ratedReviewCount > 0 && product.averageRating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(product.averageRating.toFixed(1)),
                reviewCount: ratedReviewCount
              }
            }
          : {})
      },
      merchantReturnPolicy
    ]
  };

  return (
    <section className="section section--product">
      <div className="container">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Shop", href: "/shop" },
            { name: product.name, href: `/shop/${product.slug}` }
          ]}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AnalyticsEvent
          eventName="view_item"
          params={{
            currency: product.currency,
            value: product.priceCents / 100,
            items: [analyticsItem]
          }}
          dedupeKey={`view_item:${product.id}`}
        />
        <div className="product-detail">
          <ProductGallery images={displayGallery} alt={product.name} />
          <div className="product-detail__copy">
            <h1>{product.name}</h1>
            <p>{product.tagline}</p>

            <div className="product-price-stack product-price-stack--detail">
              {product.compareAtPriceCents ? (
                <span className="product-price-stack__original">
                  {formatCurrency(product.compareAtPriceCents, product.currency)}
                </span>
              ) : null}
              <strong className="product-price-stack__sale">
                {formatCurrency(product.priceCents, product.currency)}
              </strong>
              {savingsCents > 0 ? (
                <span className="product-price-stack__off">
                  {formatCurrency(savingsCents, product.currency)} Off
                </span>
              ) : null}
            </div>
            {activePriceValidUntil ? (
              <p className="form-note">
                Current price valid through{" "}
                <time dateTime={activePriceValidUntil.toISOString()}>
                  {formatDate(activePriceValidUntil)}
                </time>.
              </p>
            ) : null}
            <div className="product-detail__rating">
              <RatingStars
                rating={product.averageRating}
                reviewCount={ratedReviewCount}
                showCount
                size="md"
              />
              <a href="#reviews" className="link-inline">
                See customer reviews
              </a>
            </div>

            <p>{product.description}</p>
            <div className="product-detail__facts">
              <span className="pill">Ships in the United States</span>
              <span className="pill">Silky daily texture</span>
              <span className="pill">Easy morning and night layering</span>
              {story.heroLabel ? <span className="pill">{story.heroLabel}</span> : null}
            </div>
            <div className="product-detail__purchase-actions">
              <form action={addToCartAction} className="checkout-form product-detail__cart-form">
                <input type="hidden" name="productId" value={product.id} />
                <div className="field">
                  <label htmlFor="quantity">Quantity</label>
                  <select id="quantity" name="quantity" defaultValue="1">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <button type="submit" className="button button--primary">
                  Add to cart
                </button>
              </form>
              {amazonProductUrl ? (
                <TrackedExternalLink
                  href={amazonProductUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--amazon"
                  eventName="select_external_marketplace"
                  item={analyticsItem}
                >
                  Buy on Amazon
                </TrackedExternalLink>
              ) : null}
            </div>
            <ul className="detail-list">
              {product.details.split("\n").map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <div className="stack-row">
              <ButtonLink href="/shop" variant="secondary">
                Back to shop
              </ButtonLink>
              <ButtonLink href="/cart" variant="ghost">
                View cart
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className="product-page-stack">
          <section className="product-page-section product-page-section--centered product-delivery-section">
            <div className="section-heading">
              <p className="section-heading__eyebrow">Delivery & returns</p>
              <h2>Free mainland U.S. shipping and a 30-day return window.</h2>
              <p>
                Paid orders are typically processed within one business day. Eligible direct
                website purchases can request return support within 30 days of delivery.
              </p>
            </div>
            <div className="stack-row product-delivery-section__actions">
              <ButtonLink href="/shipping-policy" variant="secondary">Shipping policy</ButtonLink>
              <ButtonLink href="/return-policy" variant="ghost">Return policy</ButtonLink>
            </div>
          </section>

          <ProductContentFlow
            slots={{
              "visual-story": (
                <>
                  <ProductTextureVideoSection product={product} />

          {isNadSerum ? (
            <ProductCustomerVoiceSlider
              eyebrow="TikTok routine"
              heading="Watch NAD+ Serum in a real creator routine."
              description="A full creator clip from @vicky.mendoza11 showing the serum in motion, with the original TikTok post one tap away."
              videos={nadSerumCustomerVoiceVideos}
            />
          ) : null}

          {isPdrnCream ? (
            <>
              <ProductCustomerVoiceSlider
                eyebrow="Customer voice"
                heading="See how real shoppers talk about Neatique PDRN Cream before you buy."
                description="A quick look at texture, finish, and daily-routine feedback from TikTok creators who help new shoppers picture how the cream actually wears."
                videos={pdrnCreamCustomerVoiceVideos}
              />

              <section className="product-page-section product-highlight-section">
                <div className="section-heading">
                  <p className="section-heading__eyebrow">Why it stands out</p>
                  <h2>
                    A Salmon PDRN Cream, PDRN Pink Cream, and PDRN Capsule Cream story in one
                    formula.
                  </h2>
                  <p className="section-heading__description">
                    The formula is designed to feel plush on contact, elegant through the routine,
                    and visibly refined once it becomes the final layer on skin.
                  </p>
                </div>
                <div className="product-highlight-grid">
                  {pdrnCreamHighlightCards.map((card) => (
                    <article key={card.title} className="product-highlight-card">
                      <p className="eyebrow">{card.eyebrow}</p>
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              {pdrnCreamEditorialSections.map((section) => (
                <section
                  key={section.id}
                  className={`product-page-section product-editorial ${section.imagePosition === "left" ? "product-editorial--reverse" : ""}`}
                >
                  <div className="product-editorial__copy">
                    <p className="eyebrow">{section.eyebrow}</p>
                    <h2>{section.title}</h2>
                    <div className="product-editorial__body">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    {section.bullets ? (
                      <ul className="product-editorial__bullets">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {section.image.src ? (
                    <div
                      className={`product-editorial__image product-editorial__image--${section.imageVariant}`}
                    >
                      <Image
                        src={section.image.src}
                        alt={section.image.alt}
                        width={880}
                        height={section.imageVariant === "portrait" ? 1080 : 880}
                        sizes="(max-width: 720px) 100vw, (max-width: 1080px) 80vw, 42vw"
                        className="product-editorial__image-media"
                      />
                      <AiGeneratedPersonBadge src={section.image.src} />
                    </div>
                  ) : null}
                </section>
              ))}

              <section className="product-page-section product-editorial product-editorial--gallery">
                <div className="product-editorial__copy">
                  <p className="eyebrow">{pdrnCreamTextureGallery.eyebrow}</p>
                  <h2>{pdrnCreamTextureGallery.title}</h2>
                  <div className="product-editorial__body">
                    {pdrnCreamTextureGallery.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                <div className="product-editorial__gallery">
                  {pdrnCreamTextureGallery.images.map((image) => (
                    <div key={image.src} className="product-editorial__image product-editorial__image--square">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={880}
                        height={880}
                        sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 26vw"
                        className="product-editorial__image-media"
                      />
                      <AiGeneratedPersonBadge src={image.src} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="product-page-section product-routine">
                <div className="product-routine__media">
                  <div className="product-editorial__image product-editorial__image--landscape">
                    <Image
                      src={pdrnCreamRoutineContent.image.src}
                      alt={pdrnCreamRoutineContent.image.alt}
                      width={1200}
                      height={800}
                      sizes="(max-width: 720px) 100vw, (max-width: 1080px) 80vw, 48vw"
                      className="product-editorial__image-media"
                    />
                    <AiGeneratedPersonBadge src={pdrnCreamRoutineContent.image.src} />
                  </div>
                </div>
                <div className="product-routine__copy">
                  <p className="eyebrow">{pdrnCreamRoutineContent.eyebrow}</p>
                  <h2>{pdrnCreamRoutineContent.title}</h2>
                  {pdrnCreamRoutineContent.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <div className="product-routine__steps">
                    {pdrnCreamRoutineContent.steps.map((step) => (
                      <article key={step.index} className="product-routine__step">
                        <span className="product-routine__index">{step.index}</span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.body}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="stack-row">
                    <ButtonLink href="/shop/pdrn-serum" variant="secondary">
                      Shop PDRN Serum
                    </ButtonLink>
                    <ButtonLink href="/cart" variant="ghost">
                      Go to cart
                    </ButtonLink>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {isPdrnSerum ? (
            <>
              <section className="product-page-section product-highlight-section">
                <div className="section-heading">
                  <p className="section-heading__eyebrow">Salmon PDRN pink serum</p>
                  <h2>
                    A PDRN serum for face routines that want deep hydration, daily repair, and a
                    smooth fresh finish.
                  </h2>
                </div>
                <div className="product-highlight-grid">
                  {pdrnSerumHeroCards.map((card) => (
                    <article key={card.title} className="product-highlight-card">
                      <p className="eyebrow">{card.eyebrow}</p>
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              {pdrnSerumEditorialSections.map((section) => (
                <section
                  key={section.id}
                  className="product-page-section product-editorial product-editorial--balanced"
                >
                  <div
                    className={`product-editorial__top ${section.imagePosition === "left" ? "product-editorial__top--reverse" : ""}`}
                  >
                    <div className="product-editorial__copy product-editorial__copy--balanced">
                      <p className="eyebrow">{section.eyebrow}</p>
                      <h2>{section.title}</h2>
                      <div className="product-editorial__body">
                        {section.paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                    {section.image.src ? (
                      <div className="product-editorial__image product-editorial__image--four-three">
                        <LandingImage
                          src={section.image.src}
                          alt={section.image.alt}
                          width={section.image.width}
                          height={section.image.height}
                          sizes="(max-width: 720px) 100vw, (max-width: 1080px) 80vw, 42vw"
                          className="product-editorial__image-media"
                        />
                      </div>
                    ) : null}
                  </div>
                  <ul className="product-editorial__bullets">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </section>
              ))}

              <section className="product-page-section product-highlight-section">
                <div className="section-heading">
                  <p className="section-heading__eyebrow">Ingredient focus</p>
                  <h2>Built around Salmon PDRN, Sodium DNA, peptides, and the pink serum identity shoppers remember.</h2>
                  <p className="section-heading__description">
                    These ingredient cues help the page rank for the right search intent while
                    making the formula story easier to understand at a glance.
                  </p>
                </div>
                <div className="product-highlight-grid product-highlight-grid--four">
                  {pdrnSerumIngredientCards.map((card) => (
                    <article key={card.title} className="product-highlight-card">
                      <p className="eyebrow">{card.title}</p>
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="product-page-section product-highlight-section">
                <div className="section-heading">
                  <p className="section-heading__eyebrow">What it helps with</p>
                  <h2>
                    A hydrating serum, skin renewal serum, and daily repair layer for skin that
                    wants to look softer and more refined.
                  </h2>
                </div>
                <div className="product-highlight-grid product-highlight-grid--four">
                  {pdrnSerumBenefitCards.map((card) => (
                    <article key={card.title} className="product-highlight-card">
                      <p className="eyebrow">{card.title}</p>
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="product-page-section product-editorial product-editorial--gallery">
                <div className="product-editorial__copy product-editorial__copy--wide">
                  <p className="eyebrow">{pdrnSerumGallery.eyebrow}</p>
                  <h2>{pdrnSerumGallery.title}</h2>
                  <div className="product-editorial__body">
                    <p>{pdrnSerumGallery.description}</p>
                  </div>
                </div>
                <div className="product-editorial__gallery product-editorial__gallery--three">
                  {pdrnSerumGallery.images.map((image) => (
                    <div key={image.src} className="product-editorial__image product-editorial__image--four-three">
                      <LandingImage
                        src={image.src}
                        alt={image.alt}
                        width={image.width}
                        height={image.height}
                        sizes="(max-width: 720px) 100vw, (max-width: 1080px) 44vw, 28vw"
                        className="product-editorial__image-media"
                      />
                    </div>
                  ))}
                </div>
              </section>

            </>
          ) : null}

                  <ProductVisualStory story={story} />
                </>
              ),
              "product-details": <ProductDetailsStory story={story} />,
              routine: <ProductRoutineSection product={product} />,
              faq: (
                <ProductFaqSection
                  product={product}
                  faqs={isPdrnSerum ? pdrnSerumFaqs : undefined}
                />
              ),
              "collection-exploration":
                productCollections.length > 0 ? (
                  <section className="product-page-section product-page-section--centered product-collection-exploration">
                    <div className="section-heading">
                      <p className="section-heading__eyebrow">Keep exploring</p>
                      <h2>Compare this formula in its wider routine context.</h2>
                      <p className="section-heading__description">
                        Use the collection guides to compare textures, routine order and related
                        formulas before adding another step.
                      </p>
                    </div>
                    <div className="cards-3">
                      {productCollections.map((collection) => (
                        <article key={collection.slug} className="panel">
                          <h3>{collection.shortTitle}</h3>
                          <p>{collection.description}</p>
                          <ButtonLink
                            href={`/collections/${collection.slug}`}
                            variant="secondary"
                          >
                            View collection
                          </ButtonLink>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null,
              transparency: <ProductTransparencySection product={product} />,
              reviews: (
                <section
                  id="reviews"
                  className="product-page-section product-page-section--centered"
                >
                  <div className="section-heading">
                    <p className="section-heading__eyebrow">Product reviews</p>
                    <h2>What customers are saying about this formula.</h2>
                    <p className="section-heading__description">
                      Reviews are linked to the matching product SKU, with the purchase channel
                      shown whenever it was supplied with the feedback.
                    </p>
                  </div>
                  <div className="review-stack">
                    <ProductReviewsShowcase
                      reviews={reviews}
                      averageRating={product.averageRating}
                    />
                    <Suspense fallback={null}>
                      <ProductReviewSubmission
                        productId={product.id}
                        productSlug={product.slug}
                      />
                    </Suspense>
                  </div>
                </section>
              ),
              "discovery-intro": (
                <section className="product-page-section product-page-section--centered product-discovery-intro">
                  <div className="section-heading">
                    <p className="section-heading__eyebrow">Keep exploring</p>
                    <h2>Continue with products and guidance chosen for this formula.</h2>
                    <p className="section-heading__description">
                      Explore a small set of related products first, then use the routine guides
                      when you want more context before adding another layer.
                    </p>
                  </div>
                  <div className="stack-row product-discovery-intro__actions">
                    <ButtonLink href="/shop" variant="secondary">
                      Explore all products
                    </ButtonLink>
                    <ButtonLink href="/collections" variant="ghost">
                      Browse collections
                    </ButtonLink>
                  </div>
                </section>
              ),
              "related-products": (
                <ProductRelatedProductsSection relatedProducts={relatedProducts} />
              ),
              "related-guides":
                relatedGuides.length > 0 ? (
                  <section className="product-page-section product-page-section--centered product-related-guides-section">
                    <div className="section-heading">
                      <p className="section-heading__eyebrow">Related routine guides</p>
                      <h2>Learn how to place this product in a simpler routine.</h2>
                      <p className="section-heading__description">
                        Read the most relevant Neatique guides for application order, texture
                        pairing and routine decisions.
                      </p>
                    </div>
                    <div className="article-related-guides">
                      <ul>
                        {relatedGuides.map((post) => (
                          <li key={post.id}>
                            <ButtonLink
                              href={`/beauty-tips/${post.slug}`}
                              variant="ghost"
                            >
                              {post.title}
                            </ButtonLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ) : null
            }}
          />
        </div>
      </div>
    </section>
  );
}
