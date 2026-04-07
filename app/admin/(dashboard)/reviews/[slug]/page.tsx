import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { ReviewBulkActionButton } from "@/components/admin/review-bulk-action-button";
import { ReviewBulkSelectToggle } from "@/components/admin/review-bulk-select-toggle";
import { ReviewInlineRow } from "@/components/admin/review-inline-row";
import { RatingStars } from "@/components/ui/rating-stars";
import {
  bulkImportReviewsAction,
  generateAiReviewsAction
} from "@/app/admin/actions";
import { getOpenAiReviewSettings } from "@/lib/openai-reviews";
import { getAdminReviewPageByProductSlug } from "@/lib/queries";

type AdminProductReviewsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
};

const pageSize = 50;
const csvColumns = "displayName,email,rating,title,content,reviewDate,verifiedPurchase,status";

function buildPageHref(slug: string, page: number) {
  return `/admin/reviews/${slug}?page=${page}`;
}

function toDefaultAiStartDate() {
  return new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function toDefaultAiEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminProductReviewsPage({
  params,
  searchParams
}: AdminProductReviewsPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const openAiSettings = getOpenAiReviewSettings();
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
  const aiGeneratedDraftCount = reviews.filter(
    (review) => review.source === "AI_GENERATED" && review.status === "PENDING"
  ).length;
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
          : query.status === "rating-distribution-mismatch"
            ? "The 5-star through 1-star counts must add up exactly to the total draft quantity."
            : query.status === "invalid-date-range"
              ? "Choose a valid review date range with an end date on or after the start date."
          : query.status === "no-selection"
            ? "Select at least one review before using a bulk action."
            : query.status === "ai-generated"
              ? "AI review drafts were generated and placed into the pending list."
            : query.status === "ai-failed"
                ? "AI review generation failed. Please try again in a moment."
                : query.status === "missing-reference-file"
                  ? "Choose a reference review file, or switch the generator to Direct generate."
                : query.status === "invalid-reference-file"
                  ? "The uploaded reference file could not be read. Use a CSV, XLSX, or XLS file with title and body columns."
                  : query.status === "ai-not-configured"
                    ? "OpenAI is not configured for AI review generation."
                    : null;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Reviews / {product.name}</p>
        <h1>Edit reviews for {product.name}.</h1>
        <p>
          Moderate reviews, update ratings, and import more comments for this product without
          loading the rest of the catalog.
        </p>
      </div>

      <div className="stack-row">
        <Link href="/admin/reviews" className="button button--secondary">
          Back to Products
        </Link>
        <Link href={`/shop/${product.slug}`} className="button button--ghost">
          View Product Page
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

            <div className="stack-row">
              <span className="pill">{openAiSettings.model}</span>
              <span className="pill">{aiGeneratedDraftCount} AI drafts on this page</span>
            </div>

            <form action={bulkImportReviewsAction} encType="multipart/form-data" className="admin-form">
              <input type="hidden" name="productSlug" value={product.slug} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <div className="field">
                <label htmlFor={`csvFile-${product.id}`}>Upload CSV for {product.name}</label>
                <input
                  id={`csvFile-${product.id}`}
                  name="csvFile"
                  type="file"
                  accept=".csv,text/csv"
                />
              </div>
              <p className="form-note">
                CSV columns: <code>{csvColumns}</code>. Imported reviews default to verified unless
                the file explicitly sets <code>verifiedPurchase</code> to a false-style value.
              </p>
              <div className="stack-row">
                <button type="submit" className="button button--primary">
                  Import CSV
                </button>
                <Link
                  href={`/api/admin/reviews/${product.slug}/export`}
                  className="button button--secondary"
                >
                  Export CSV
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>AI review generator</h2>
            <p className="form-note">
              Create pending AI review drafts for this product, then approve them one by one or in
              bulk. Choose whether the model should create varied reviews from scratch, or stay
              closer to the tone and structure in your uploaded review examples.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">Product fixed: {product.name}</span>
            <span className="pill">Model {openAiSettings.model}</span>
          </div>
        </div>

        <form action={generateAiReviewsAction} encType="multipart/form-data" className="admin-form">
          <input type="hidden" name="productSlug" value={product.slug} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor={`aiQuantity-${product.id}`}>How many drafts to generate</label>
              <input
                id={`aiQuantity-${product.id}`}
                name="quantity"
                type="number"
                min="1"
                max="100"
                defaultValue="10"
                required
              />
            </div>
            <fieldset className="field">
              <legend>Generation mode</legend>
              <div className="stack-row stack-row--wrap">
                <label className="choice-pill">
                  <input
                    type="radio"
                    name="generationMode"
                    value="direct"
                    defaultChecked
                  />
                  <span>Direct generate</span>
                </label>
                <label className="choice-pill">
                  <input
                    type="radio"
                    name="generationMode"
                    value="reference"
                  />
                  <span>Reference review file</span>
                </label>
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor={`referenceFile-${product.id}`}>Reference review file</label>
              <input
                id={`referenceFile-${product.id}`}
                name="referenceFile"
                type="file"
                accept=".csv,.xlsx,.xls"
              />
            </div>
          </div>

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor={`ratingCount5-${product.id}`}>5-star count</label>
              <input id={`ratingCount5-${product.id}`} name="ratingCount5" type="number" min="0" max="100" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor={`ratingCount4-${product.id}`}>4-star count</label>
              <input id={`ratingCount4-${product.id}`} name="ratingCount4" type="number" min="0" max="100" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor={`ratingCount3-${product.id}`}>3-star count</label>
              <input id={`ratingCount3-${product.id}`} name="ratingCount3" type="number" min="0" max="100" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor={`ratingCount2-${product.id}`}>2-star count</label>
              <input id={`ratingCount2-${product.id}`} name="ratingCount2" type="number" min="0" max="100" defaultValue="0" />
            </div>
            <div className="field">
              <label htmlFor={`ratingCount1-${product.id}`}>1-star count</label>
              <input id={`ratingCount1-${product.id}`} name="ratingCount1" type="number" min="0" max="100" defaultValue="0" />
            </div>
          </div>

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor={`reviewDateStart-${product.id}`}>Review date start</label>
              <input
                id={`reviewDateStart-${product.id}`}
                name="reviewDateStart"
                type="date"
                defaultValue={toDefaultAiStartDate()}
              />
            </div>
            <div className="field">
              <label htmlFor={`reviewDateEnd-${product.id}`}>Review date end</label>
              <input
                id={`reviewDateEnd-${product.id}`}
                name="reviewDateEnd"
                type="date"
                defaultValue={toDefaultAiEndDate()}
              />
            </div>
          </div>

          <p className="form-note">
            Direct generate creates product-related reviews in a wide mix of styles with no file
            required. Reference review file uses your uploaded CSV, XLSX, or XLS examples as the
            style source. Supported reference columns: review title, review body/content, rating,
            and reviewer name. If you upload 20 examples and generate 40 drafts, the AI will keep
            rotating through those examples as style references without copying wording, and
            generated reviewer names will stay as full names instead of initials. AI-generated
            drafts are added as pending and marked verified by default. If you fill any star-count
            boxes, the total across 5-star to 1-star must exactly match the draft quantity. The
            selected review date window is used to write stronger randomized review dates across the
            full range rather than clustering them near one day.
          </p>

          <PendingSubmitButton
            idleLabel="Generate AI review drafts"
            pendingLabel="Generating AI review drafts..."
            modalTitle="Generating product review drafts"
            modalDescription="New pending reviews are being created now. This can take a little while while the model builds multiple different voices and lengths."
            disabled={!openAiSettings.ready}
          />
        </form>
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
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Verified</th>
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
          <p>Upload a CSV for {product.name} or wait for customer reviews to appear here.</p>
        </section>
      )}
    </div>
  );
}
