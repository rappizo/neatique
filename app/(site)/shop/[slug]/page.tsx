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
import { getProductStory } from "@/lib/product-content";
import {
  getCustomerAccountById,
  getProductBySlug,
  getPublishedReviewsByProductId
} from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string; error?: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found"
    };
  }

  if (product.slug === "pdrn-cream") {
    return {
      title: pdrnCreamSeo.title,
      description: pdrnCreamSeo.description,
      keywords: pdrnCreamSeo.keywords,
      alternates: {
        canonical: `/shop/${product.slug}`
      },
      openGraph: {
        title: `${pdrnCreamSeo.title} | ${siteConfig.title}`,
        description: pdrnCreamSeo.description,
        url: `${siteConfig.url}/shop/${product.slug}`,
        images: [product.imageUrl]
      }
    };
  }

  return {
    title: product.name,
    description: product.shortDescription,
    alternates: {
      canonical: `/shop/${product.slug}`
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: isPdrnCream ? pdrnCreamSeo.description : product.shortDescription,
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
    <section className="section">
      <div className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="product-detail">
          <ProductGallery images={displayGallery} alt={product.name} />
          <div className="product-detail__copy">
            <div className="product-detail__meta">
              <span>{product.category}</span>
              <span>Product ID {product.productCode || "Pending"}</span>
              <span>{product.inventory} units in stock</span>
              <span>{product.pointsReward} reward points</span>
              {product.reviewCount ? <span>{product.reviewCount} reviews</span> : null}
            </div>
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

          {!isPdrnCream && story.sections.length > 0 ? (
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
