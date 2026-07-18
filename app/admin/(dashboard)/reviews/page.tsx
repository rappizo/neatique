import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/ui/rating-stars";
import { uploadReviewAction } from "@/app/admin/actions";
import { getAdminReviewProducts } from "@/lib/queries";

type AdminReviewsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  const [products, params] = await Promise.all([getAdminReviewProducts(), searchParams]);
  const statusMessage =
    params.status === "uploaded"
      ? "Review uploaded and published on the selected SKU."
      : params.status === "upload-missing-fields"
        ? "Username, SKU, purchase channel, and review content are required."
        : params.status === "upload-invalid-image-url"
          ? "Review image link must be a valid http:// or https:// URL."
          : params.status === "upload-sku-not-found"
            ? "The selected SKU could not be found."
            : null;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Reviews</p>
        <h1>Open a product to manage its reviews.</h1>
        <p>
          Start from the product card, then review authentic customer feedback with pagination,
          moderation, and audited CSV import tools inside its own workspace.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {statusMessage || (params.status === "ai-reviews-disabled"
            ? "Synthetic review generation and persona creation are disabled."
            : `Review action completed: ${params.status}.`)}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Review workflow</h2>
        <p className="form-note">
          Step 1: choose a product. Step 2: edit or moderate reviews 50 at a time. Step 3: import
          documented customer feedback with a CSV that belongs only to that product. Imported
          reviews remain unverified unless they are linked to a real order.
        </p>
      </section>

      <section className="admin-form admin-review-upload">
        <div>
          <p className="eyebrow">Upload Review</p>
          <h2>Publish a review under an existing SKU</h2>
          <p className="form-note">
            The review is published immediately on the product page linked to the selected SKU.
            Uploaded reviews are not labeled as verified purchases.
          </p>
        </div>

        <form action={uploadReviewAction}>
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="review-display-name">Username</label>
              <input
                id="review-display-name"
                name="displayName"
                type="text"
                maxLength={100}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="review-product-id">SKU</label>
              <select id="review-product-id" name="productId" defaultValue="" required>
                <option value="" disabled>
                  Select an existing SKU
                </option>
                {products
                  .filter((product) => product.productCode)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productCode} — {product.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="review-purchase-channel">Purchase channel</label>
              <input
                id="review-purchase-channel"
                name="purchaseChannel"
                type="text"
                maxLength={120}
                placeholder="Amazon, TikTok Shop, website..."
                required
              />
            </div>

            <div className="field">
              <label htmlFor="review-image-url">Review image link (optional)</label>
              <input
                id="review-image-url"
                name="reviewImageUrl"
                type="url"
                maxLength={2048}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="review-content">Review content</label>
            <textarea id="review-content" name="content" maxLength={5000} required />
          </div>

          <div className="stack-row">
            <button type="submit" className="button button--primary">
              Upload Review
            </button>
          </div>
        </form>
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
