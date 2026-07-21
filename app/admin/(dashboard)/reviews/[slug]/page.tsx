import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewBulkActionButton } from "@/components/admin/review-bulk-action-button";
import { ReviewBulkSelectToggle } from "@/components/admin/review-bulk-select-toggle";
import { ReviewInlineRow } from "@/components/admin/review-inline-row";
import { RatingStars } from "@/components/ui/rating-stars";
import { getAdminReviewPageByProductSlug } from "@/lib/queries";

type AdminProductReviewsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
};

const pageSize = 50;

function buildPageHref(slug: string, page: number) {
  return `/admin/reviews/${slug}?page=${page}`;
}

export default async function AdminProductReviewsPage({
  params,
  searchParams
}: AdminProductReviewsPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Number.parseInt(query.page || "1", 10);
  const reviewPage = await getAdminReviewPageByProductSlug(
    slug,
    Number.isFinite(requestedPage) ? requestedPage : 1,
    pageSize
  );

  if (!reviewPage) {
    notFound();
  }

  const {
    product,
    reviews,
    totalReviewCount,
    publishedReviewCount,
    pendingReviewCount,
    hiddenReviewCount,
    currentPage,
    totalPages
  } = reviewPage;
  const fromReview = totalReviewCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toReview = Math.min(currentPage * pageSize, totalReviewCount);
  const redirectTo = buildPageHref(product.slug, currentPage);
  const bulkModerationFormId = `review-bulk-moderation-${product.id}`;
  const statusMessage =
    query.status === "bulk-deleted"
      ? "Selected reviews were deleted."
      : query.status === "bulk-approved"
        ? "Selected reviews were approved."
        : query.status === "bulk-verified"
          ? "Selected reviews were marked as verified."
          : query.status === "bulk-unverified"
            ? "Selected reviews were marked as not verified."
        : query.status === "approved"
          ? "Review approved."
          : query.status === "synthetic-review-blocked"
            ? "Synthetic reviews cannot be published and were moved to hidden."
            : query.status === "ai-reviews-disabled"
              ? "Synthetic consumer review generation is disabled."
          : query.status === "no-selection"
            ? "Select at least one review before using a bulk action."
            : null;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Reviews / {product.name}</p>
        <h1>Edit reviews for {product.name}.</h1>
        <p>
          Moderate reviews and update ratings for this product without loading the rest of the
          catalog.
        </p>
      </div>

      <div className="stack-row">
        <Link href="/admin/reviews" className="button button--secondary">
          Back to Products
        </Link>
        <Link href={`/shop/${product.slug}`} className="button button--ghost">
          View Product Page
        </Link>
        <Link
          href={`/api/admin/reviews/${product.slug}/export`}
          className="button button--secondary"
        >
          Export CSV
        </Link>
      </div>

      {query.status ? (
        <p className="notice">{statusMessage || `Review action completed: ${query.status}.`}</p>
      ) : null}

      <section className="admin-review-detail admin-product-card">
        <div className="admin-review-detail__hero">
          <div className="admin-product-card__media">
            <Image src={product.imageUrl} alt={product.name} width={420} height={420} unoptimized />
          </div>

          <div className="admin-review-detail__content">
            <div className="product-card__meta">
              <span>{product.category}</span>
              <span>{product.status}</span>
              <span>{totalReviewCount} total reviews</span>
            </div>
            <h2>{product.name}</h2>
            <p>{product.shortDescription}</p>

            <div className="admin-review-group__stats">
              <div className="admin-review-group__stat">
                <strong>{publishedReviewCount}</strong>
                <span>Published</span>
              </div>
              <div className="admin-review-group__stat">
                <strong>{pendingReviewCount}</strong>
                <span>Pending</span>
              </div>
              <div className="admin-review-group__stat">
                <strong>{hiddenReviewCount}</strong>
                <span>Hidden</span>
              </div>
              <div className="admin-review-group__stat">
                <strong>{totalPages}</strong>
                <span>Pages at 50 each</span>
              </div>
            </div>

            <div className="product-card__meta">
              {product.averageRating ? (
                <RatingStars
                  rating={product.averageRating}
                  reviewCount={product.reviewCount}
                  size="sm"
                  showCount
                />
              ) : (
                <span>No published rating yet</span>
              )}
            </div>

          </div>
        </div>
      </section>

      <section className="admin-form">
        <h2>Review compliance</h2>
        <p className="form-note">
          Synthetic consumer review generation is disabled. Publish only authentic customer
          feedback, and use the Verified Purchase label only when the review is linked to a
          traceable completed order.
        </p>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Review list</h2>
            <p className="form-note">
              Showing {fromReview} to {toReview} of {totalReviewCount} reviews.
            </p>
          </div>

          <div className="stack-row">
            <form id={bulkModerationFormId} />
            <ReviewBulkActionButton
              formId={bulkModerationFormId}
              productSlug={product.slug}
              intent="approve"
              label="Approve selected"
              className="button button--secondary"
            />
            <ReviewBulkActionButton
              formId={bulkModerationFormId}
              productSlug={product.slug}
              intent="mark-verified"
              label="Mark verified"
              className="button button--secondary"
            />
            <ReviewBulkActionButton
              formId={bulkModerationFormId}
              productSlug={product.slug}
              intent="mark-unverified"
              label="Mark unverified"
              className="button button--secondary"
            />
            <ReviewBulkActionButton
              formId={bulkModerationFormId}
              productSlug={product.slug}
              intent="delete"
              label="Delete selected"
              className="button button--ghost"
            />
            <Link
              href={currentPage > 1 ? buildPageHref(product.slug, currentPage - 1) : "#"}
              className={`button button--secondary${currentPage > 1 ? "" : " button--disabled"}`}
              aria-disabled={currentPage <= 1}
            >
              Previous
            </Link>
            <span className="pill">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={currentPage < totalPages ? buildPageHref(product.slug, currentPage + 1) : "#"}
              className={`button button--secondary${currentPage < totalPages ? "" : " button--disabled"}`}
              aria-disabled={currentPage >= totalPages}
            >
              Next
            </Link>
          </div>
        </div>
      </section>

      {reviews.length > 0 ? (
        <section className="admin-table admin-table--scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <div className="admin-table__select-header">
                    <span>Select</span>
                    <ReviewBulkSelectToggle formId={bulkModerationFormId} />
                  </div>
                </th>
                    <th>Review Date</th>
                    <th>Display Name</th>
                    <th>Purchase Channel</th>
                    <th>Review Image URL</th>
                    <th>User Image</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Verified</th>
                    <th>Incentivized</th>
                    <th>Title</th>
                    <th>Content</th>
                <th>Admin Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <ReviewInlineRow
                  key={review.id}
                  review={review}
                  productSlug={product.slug}
                  bulkFormId={bulkModerationFormId}
                />
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="admin-form admin-review-item">
          <h3>No reviews yet</h3>
          <p>
            Use the separate Upload Reviews page to import a CSV, or wait for customer reviews to
            appear here.
          </p>
          <Link href="/admin/reviews/upload" className="button button--primary">
            Upload Reviews
          </Link>
        </section>
      )}
    </div>
  );
}
