import Link from "next/link";
import { uploadReviewAction } from "@/app/admin/actions";
import {
  ADMIN_REVIEW_UPLOAD_MAX_FILE_SIZE_BYTES,
  ADMIN_REVIEW_UPLOAD_MAX_ROWS
} from "@/lib/review-upload";

type AdminReviewUploadPageProps = {
  searchParams: Promise<{
    status?: string;
    count?: string;
    row?: string;
    field?: string;
    sku?: string;
  }>;
};

const fieldLabels: Record<string, string> = {
  sku: "SKU",
  username: "Username",
  purchaseChannel: "Purchase Channel",
  reviewContent: "Review Content",
  reviewImageUrl: "Review Image URL",
  reviewDate: "Review Date"
};

function getStatusMessage(params: Awaited<AdminReviewUploadPageProps["searchParams"]>) {
  const rowLabel = params.row ? ` on CSV row ${params.row}` : "";
  const fieldLabel = params.field ? fieldLabels[params.field] ?? params.field : "a required field";

  switch (params.status) {
    case "uploaded": {
      const count = Number.parseInt(params.count || "0", 10);
      return `${Number.isFinite(count) ? count : 0} review${count === 1 ? "" : "s"} uploaded and published successfully.`;
    }
    case "missing-file":
      return "Choose a CSV file before starting the upload.";
    case "file-too-large":
      return `The CSV is larger than ${ADMIN_REVIEW_UPLOAD_MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`;
    case "invalid-csv":
      return "The file is not a valid CSV. Check for an unclosed quoted field and try again.";
    case "invalid-columns":
      return `The CSV is missing the required ${fieldLabel} column. Download a fresh template and keep its header row unchanged.`;
    case "empty":
      return "The CSV contains a header but no review rows.";
    case "too-many-rows":
      return `A single CSV can contain up to ${ADMIN_REVIEW_UPLOAD_MAX_ROWS.toLocaleString("en-US")} review rows.`;
    case "invalid-row":
      return `The value for ${fieldLabel}${rowLabel} is missing or invalid. No reviews were imported.`;
    case "sku-not-found":
      return `SKU ${params.sku || "(blank)"}${rowLabel} does not match an existing product. No reviews were imported.`;
    default:
      return null;
  }
}

export default async function AdminReviewUploadPage({ searchParams }: AdminReviewUploadPageProps) {
  const params = await searchParams;
  const statusMessage = getStatusMessage(params);
  const hasError = Boolean(params.status && params.status !== "uploaded");

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Products / Upload Reviews</p>
        <h1>Batch upload product reviews from CSV.</h1>
        <p>
          Add reviews for multiple SKUs in one file. Each row is published immediately, and its
          Review Date becomes the date customers see on the storefront.
        </p>
      </div>

      <div className="stack-row">
        <Link
          href="/api/admin/reviews/upload-template"
          className="button button--secondary"
          download
        >
          Download CSV Template
        </Link>
        <Link href="/admin/reviews" className="button button--ghost">
          Manage Product Reviews
        </Link>
      </div>

      {statusMessage ? (
        <p className={hasError ? "notice notice--warning" : "notice"}>{statusMessage}</p>
      ) : null}

      <section className="admin-form">
        <div>
          <p className="eyebrow">Upload Review</p>
          <h2>Upload one CSV for the full batch</h2>
          <p className="form-note">
            Use the downloadable template, keep the header names unchanged, and save the file as
            CSV. The upload is validated as one batch; if any row is invalid, nothing is imported.
          </p>
        </div>

        <form action={uploadReviewAction} encType="multipart/form-data">
          <div className="field">
            <label htmlFor="review-upload-csv">Review CSV</label>
            <input
              id="review-upload-csv"
              name="csvFile"
              type="file"
              accept=".csv,text/csv"
              required
            />
          </div>
          <p className="form-note">
            Maximum {ADMIN_REVIEW_UPLOAD_MAX_ROWS.toLocaleString("en-US")} rows and {ADMIN_REVIEW_UPLOAD_MAX_FILE_SIZE_BYTES / 1024 / 1024} MB per file.
          </p>
          <div className="stack-row">
            <button type="submit" className="button button--primary">
              Upload Reviews
            </button>
          </div>
        </form>
      </section>

      <section className="admin-table admin-table--scroll">
        <table>
          <thead>
            <tr>
              <th>CSV column</th>
              <th>Required</th>
              <th>Format</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sku</code></td>
              <td>Yes</td>
              <td>Exact SKU from an existing product</td>
            </tr>
            <tr>
              <td><code>username</code></td>
              <td>Yes</td>
              <td>Customer display name, up to 100 characters</td>
            </tr>
            <tr>
              <td><code>purchaseChannel</code></td>
              <td>Yes</td>
              <td>For example: Amazon, TikTok Shop, or Website</td>
            </tr>
            <tr>
              <td><code>reviewContent</code></td>
              <td>Yes</td>
              <td>Review text, up to 5,000 characters</td>
            </tr>
            <tr>
              <td><code>reviewImageUrl</code></td>
              <td>No</td>
              <td>Complete http:// or https:// image URL</td>
            </tr>
            <tr>
              <td><code>reviewDate</code></td>
              <td>Yes</td>
              <td>Storefront display date in YYYY-MM-DD format</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="admin-form">
        <h2>Publishing rules</h2>
        <p className="form-note">
          CSV-uploaded reviews are published without a star rating and are not labeled as verified
          purchases. Only upload authentic customer feedback that you are authorized to publish.
        </p>
      </section>
    </div>
  );
}
