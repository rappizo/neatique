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
          Start from the product card, then review that product&apos;s comments with pagination, editing,
          and CSV import tools inside its own workspace.
        </p>
      </div>

      {params.status ? <p className="notice">Review action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <h2>Review workflow</h2>
        <p className="form-note">
          Step 1: choose a product. Step 2: edit or moderate reviews 50 at a time. Step 3: import
          more reviews with a CSV that belongs only to that product.
        </p>
      </section>

      <div className="admin-product-grid">
        {products.map((product) => (
          <article key={product.id} className="admin-product-card">
            <div className="admin-product-card__media">
              <Image src={product.imageUrl} alt={product.name} width={420} height={420} unoptimized />
            </div>

            <div className="admin-product-card__body">
              <div className="product-card__meta">
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
                    reviewCount={product.publishedReviewCount}
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
