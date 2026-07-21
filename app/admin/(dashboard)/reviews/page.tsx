import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/ui/rating-stars";
import { getAdminReviewProducts } from "@/lib/queries";

type AdminReviewsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  const [products, params] = await Promise.all([getAdminReviewProducts(), searchParams]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Reviews</p>
        <h1>Open a product to manage its reviews.</h1>
        <p>
          Start from the product card, then review authentic customer feedback with pagination,
          moderation, editing, and export tools inside its own workspace.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {params.status === "ai-reviews-disabled"
            ? "Synthetic review generation and persona creation are disabled."
            : `Review action completed: ${params.status}.`}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Review workflow</h2>
        <p className="form-note">
          Choose a product, then edit or moderate its reviews 50 at a time. Use the separate Upload
          Reviews page when you need to publish a batch from CSV.
        </p>
        <div className="stack-row">
          <Link href="/admin/reviews/upload" className="button button--primary">
            Upload Reviews
          </Link>
        </div>
      </section>

      <div className="admin-product-grid">
        {products.map((product) => (
          <article key={product.id} className="admin-product-card">
            <div className="admin-product-card__media">
              <Image src={product.imageUrl} alt={product.name} width={420} height={420} unoptimized />
            </div>

            <div className="admin-product-card__body">
              <div className="product-card__meta">
                <span>SKU {product.productCode || "Not assigned"}</span>
                <span>{product.category}</span>
                <span>{product.status}</span>
              </div>
              <h3>{product.name}</h3>
              <p>{product.shortDescription}</p>

              <div className="admin-review-card__stats">
                <span>{product.totalReviewCount} total</span>
                <span>{product.publishedReviewCount} published</span>
                <span>{product.pendingReviewCount} pending</span>
                <span>{product.hiddenReviewCount} hidden</span>
              </div>

              <div className="product-card__meta">
                {product.averageRating ? (
                  <RatingStars
                    rating={product.averageRating}
                    reviewCount={product.ratedReviewCount}
                    size="sm"
                    showCount
                  />
                ) : (
                  <span>No published rating yet</span>
                )}
              </div>

              <div className="stack-row">
                <Link href={`/admin/reviews/${product.slug}`} className="button button--primary">
                  Edit Reviews
                </Link>
                <Link href={`/shop/${product.slug}`} className="button button--secondary">
                  View Product
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
