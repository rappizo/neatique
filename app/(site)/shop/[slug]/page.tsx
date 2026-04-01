import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { submitProductReviewAction } from "@/app/(site)/account/actions";
import { addToCartAction } from "@/app/(site)/cart/actions";
import { ProductCustomerVoiceSlider } from "@/components/product/product-customer-voice-slider";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductReviewsShowcase } from "@/components/product/product-reviews-showcase";
import { ButtonLink } from "@/components/ui/button-link";
import { RatingStars } from "@/components/ui/rating-stars";
import { getCurrentCustomerId } from "@/lib/customer-auth";
import { formatCurrency, getSavingsCents } from "@/lib/format";
import {
  pdrnCreamCustomerVoiceVideos,
  pdrnCreamEditorialSections,
  pdrnCreamHighlightCards,
  pdrnCreamRoutineContent,
  pdrnCreamSeo,
  pdrnCreamTextureGallery
} from "@/lib/pdrn-cream-page";
import {
  pdrnSerumBenefitCards,
  pdrnSerumEditorialSections,
  pdrnSerumFaqs,
  pdrnSerumGallery,
  pdrnSerumHeroCards,
  pdrnSerumIngredientCards,
  pdrnSerumSeo
} from "@/lib/pdrn-serum-page";
import { getProductStory } from "@/lib/product-content";
import {
  getCustomerAccountById,
  getProductBySlug,
  getPublishedReviewsByProductId
} from "@/lib/queries";
import { nt16SerumSeo } from "@/lib/nt16-serum-page";
import { toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { tnv3SerumSeo } from "@/lib/tnv3-serum-page";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string; error?: string }>;
};

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
    // eslint-disable-next-line @next/next/no-img-element
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
  );
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
  const title =
    product.slug === "nt16-niacinamide-tranexamic-serum"
      ? nt16SerumSeo.title
      : 
    product.slug === "pdrn-serum"
      ? pdrnSerumSeo.title
      :
    product.slug === "pdrn-cream"
      ? pdrnCreamSeo.title
      : product.slug === "tnv3-tranexamic-nicotinamide-serum"
        ? tnv3SerumSeo.title
        : product.name;
  const description =
    product.slug === "nt16-niacinamide-tranexamic-serum"
      ? nt16SerumSeo.description
      : 
    product.slug === "pdrn-serum"
      ? pdrnSerumSeo.description
      :
    product.slug === "pdrn-cream"
      ? pdrnCreamSeo.description
      : product.slug === "tnv3-tranexamic-nicotinamide-serum"
        ? tnv3SerumSeo.description
        : product.shortDescription;

  if (product.slug === "nt16-niacinamide-tranexamic-serum") {
    return {
      title,
      description,
      keywords: nt16SerumSeo.keywords,
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
      keywords: pdrnCreamSeo.keywords,
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
      keywords: pdrnSerumSeo.keywords,
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
      keywords: tnv3SerumSeo.keywords,
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
    keywords: [
      product.name,
      `${product.category} skincare`,
      `${product.name} review`,
      `buy ${product.name}`,
      `${siteConfig.name} ${product.category}`
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

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const [product, customerId, query] = await Promise.all([
    getProductBySlug(slug),
    getCurrentCustomerId(),
    searchParams
  ]);

  if (!product) {
    notFound();
  }

  const [reviews, account] = await Promise.all([
    getPublishedReviewsByProductId(product.id),
    customerId ? getCustomerAccountById(customerId) : Promise.resolve(null)
  ]);

  const story = getProductStory(product.slug);
  const gallery = product.galleryImages.length > 0 ? product.galleryImages : story.gallery;
  const displayGallery = gallery.length > 0 ? gallery : [product.imageUrl];
  const canReview = Boolean(account?.purchasedProductIds.includes(product.id));
  const savingsCents = getSavingsCents(product.compareAtPriceCents, product.priceCents);
  const isPdrnCream = product.slug === "pdrn-cream";
  const isPdrnSerum = product.slug === "pdrn-serum";
  const seoDescription =
    product.slug === "pdrn-cream"
      ? pdrnCreamSeo.description
      : product.slug === "pdrn-serum"
        ? pdrnSerumSeo.description
      : product.slug === "tnv3-tranexamic-nicotinamide-serum"
        ? tnv3SerumSeo.description
        : product.slug === "nt16-niacinamide-tranexamic-serum"
          ? nt16SerumSeo.description
          : product.shortDescription;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: seoDescription,
    sku: product.productCode,
    image: displayGallery.slice(0, 8).map((image) => new URL(image, siteConfig.url).toString()),
    brand: {
      "@type": "Brand",
      name: siteConfig.name
    },
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/shop/${product.slug}`,
      priceCurrency: product.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    ...(reviews.length > 0 && product.averageRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(product.averageRating.toFixed(1)),
            reviewCount: reviews.length
          }
        }
      : {})
  };

  return (
    <section className="section section--product">
      <div className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
            <div className="product-detail__rating">
              <RatingStars
                rating={product.averageRating}
                reviewCount={product.reviewCount}
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
            <form action={addToCartAction} className="checkout-form">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="redirectTo" value="/cart?status=added" />
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
                    <ul className="product-editorial__bullets">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
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

              <section className="product-page-section">
                <div className="section-heading">
                  <p className="section-heading__eyebrow">FAQ</p>
                  <h2>Answers to the search questions shoppers ask before choosing a PDRN serum.</h2>
                  <p className="section-heading__description">
                    These are written to match real shopping questions while keeping the page
                    useful, natural, and easy for Google to understand.
                  </p>
                </div>
                <div className="story-sections">
                  {pdrnSerumFaqs.map((faq) => (
                    <article key={faq.question} className="panel">
                      <h3>{faq.question}</h3>
                      <p>{faq.answer}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {!isPdrnCream && !isPdrnSerum && story.sections.length > 0 ? (
            <section className="product-page-section">
              <div className="section-heading">
                <p className="section-heading__eyebrow">Product details</p>
                <h2>Everything you may want to know before adding it to your routine.</h2>
                <p className="section-heading__description">
                  Browse the formula story, texture, finish, and easy layering notes before you
                  head to cart.
                </p>
              </div>
              <div className="story-sections">
                {story.sections.map((section) => (
                  <article key={section.title} className="panel">
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section id="reviews" className="product-page-section">
            <div className="section-heading">
              <p className="section-heading__eyebrow">Product reviews</p>
              <h2>What customers are saying about this formula.</h2>
              <p className="section-heading__description">
                Reviews are published after purchase so new shoppers can browse real feedback with
                confidence.
              </p>
            </div>

            {query.review === "submitted" ? (
              <p className="notice">Your review was submitted and is waiting for approval.</p>
            ) : null}
            {query.error === "review-not-eligible" ? (
              <p className="notice">
                Only customers with a completed purchase can review this product.
              </p>
            ) : null}

            <div className="review-stack">
              <ProductReviewsShowcase reviews={reviews} averageRating={product.averageRating} />

              <section className="admin-form review-form-panel">
                <h2>Leave a review</h2>
                {canReview ? (
                  <form action={submitProductReviewAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="productSlug" value={product.slug} />
                    <div className="field">
                      <label htmlFor="rating">Rating</label>
                      <select id="rating" name="rating" defaultValue="5">
                        <option value="5">5</option>
                        <option value="4">4</option>
                        <option value="3">3</option>
                        <option value="2">2</option>
                        <option value="1">1</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="title">Review title</label>
                      <input id="title" name="title" required />
                    </div>
                    <div className="field">
                      <label htmlFor="content">Your review</label>
                      <textarea id="content" name="content" required />
                    </div>
                    <button type="submit" className="button button--primary">
                      Submit review
                    </button>
                  </form>
                ) : (
                  <p>Review submission becomes available after you complete a purchase.</p>
                )}
              </section>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
