import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { submitProductReviewAction } from "@/app/(site)/account/actions";
import { addToCartAction } from "@/app/(site)/cart/actions";
import { ProductGallery } from "@/components/product/product-gallery";
import { ButtonLink } from "@/components/ui/button-link";
import { RatingStars } from "@/components/ui/rating-stars";
import { getCurrentCustomerId } from "@/lib/customer-auth";
import { formatCurrency, getSavingsCents } from "@/lib/format";
import { getProductStory } from "@/lib/product-content";
import {
  getCustomerAccountById,
  getProductBySlug,
  getPublishedReviewsByProductId
} from "@/lib/queries";

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

  return {
    title: product.name,
    description: product.shortDescription
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

  return (
    <section className="section">
      <div className="container">
        <div className="product-detail">
          <ProductGallery images={displayGallery} alt={product.name} />
          <div className="product-detail__copy">
            <div className="product-detail__meta">
              <span>{product.category}</span>
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

        {story.sections.length > 0 ? (
          <div className="section">
            <div className="section-heading">
              <p className="section-heading__eyebrow">Product details</p>
              <h2>Everything you may want to know before adding it to your routine.</h2>
              <p className="section-heading__description">
                Browse the formula story, texture, finish, and easy layering notes before you head
                to cart.
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
          </div>
        ) : null}

        <div id="reviews" className="section">
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
            <p className="notice">Only customers with a completed purchase can review this product.</p>
          ) : null}

          <div className="review-stack">
            <section className="admin-card review-showcase-panel">
              <div className="review-showcase-panel__header">
                <div className="review-showcase-panel__summary">
                  <h3>Customer rating</h3>
                  <RatingStars
                    rating={product.averageRating}
                    reviewCount={reviews.length}
                    showCount
                    size="lg"
                  />
                  <p>
                    {reviews.length > 0
                      ? "A lively mix of short, glow-focused feedback from shoppers who already tried the formula."
                      : "No reviews have been published yet."}
                  </p>
                </div>
              </div>
              <div className="review-showcase">
                {reviews.map((review) => (
                  <article key={review.id} className="review-card">
                    <div className="review-card__meta">
                      <strong>{review.displayName}</strong>
                      {review.verifiedPurchase ? <span>Verified purchase</span> : null}
                    </div>
                    <RatingStars rating={review.rating} size="sm" />
                    <h4>{review.title}</h4>
                    <p>{review.content}</p>
                  </article>
                ))}
              </div>
            </section>

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
        </div>
      </div>
    </section>
  );
}
