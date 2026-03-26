import {
  bulkImportReviewsAction,
  deleteReviewAction,
  updateReviewAction
} from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { getAllReviews } from "@/lib/queries";

type AdminReviewsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  const [reviews, params] = await Promise.all([getAllReviews(), searchParams]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Reviews</p>
        <h1>Manage storefront reviews, moderation, and bulk imports.</h1>
        <p>
          Purchased customers can leave reviews from the front end, while the admin team can edit,
          publish, hide, or bulk import reviews for launch content and migration work.
        </p>
      </div>

      {params.status ? <p className="notice">Review action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <h2>Bulk import reviews</h2>
        <p>Use one review per line in this format: `product-slug|Display Name|email@example.com|5|Title|Review body|true|PUBLISHED`</p>
        <form action={bulkImportReviewsAction}>
          <div className="field">
            <label htmlFor="rows">Review rows</label>
            <textarea id="rows" name="rows" />
          </div>
          <button type="submit" className="button button--primary">
            Import reviews
          </button>
        </form>
      </section>

      <div className="cards-2">
        {reviews.map((review) => (
          <section key={review.id} className="admin-form">
            <h2>{review.productName || "Product review"}</h2>
            <p>
              {review.displayName} · {formatDate(review.createdAt)} · {review.customerEmail || "No customer record"}
            </p>
            <form action={updateReviewAction}>
              <input type="hidden" name="id" value={review.id} />
              <div className="admin-form__grid">
                <div className="field">
                  <label>Display name</label>
                  <input name="displayName" defaultValue={review.displayName} />
                </div>
                <div className="field">
                  <label>Rating</label>
                  <input name="rating" type="number" min="1" max="5" defaultValue={review.rating} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select name="status" defaultValue={review.status}>
                    <option value="PENDING">PENDING</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                </div>
                <label className="field field--checkbox">
                  <input type="checkbox" name="verifiedPurchase" defaultChecked={review.verifiedPurchase} />
                  Verified purchase
                </label>
              </div>
              <div className="field">
                <label>Title</label>
                <input name="title" defaultValue={review.title} />
              </div>
              <div className="field">
                <label>Content</label>
                <textarea name="content" defaultValue={review.content} />
              </div>
              <div className="field">
                <label>Admin notes</label>
                <textarea name="adminNotes" defaultValue={review.adminNotes ?? ""} />
              </div>
              <button type="submit" className="button button--primary">
                Save review
              </button>
            </form>
            <form action={deleteReviewAction}>
              <input type="hidden" name="id" value={review.id} />
              <button type="submit" className="button button--ghost">
                Delete review
              </button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
