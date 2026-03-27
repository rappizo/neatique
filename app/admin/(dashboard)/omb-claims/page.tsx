import Link from "next/link";
import { updateOmbClaimAction } from "@/app/admin/actions";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";
import { getOmbClaims } from "@/lib/queries";

type AdminOmbClaimsPageProps = {
  searchParams: Promise<{ email?: string; status?: string }>;
};

export default async function AdminOmbClaimsPage({ searchParams }: AdminOmbClaimsPageProps) {
  const params = await searchParams;
  const searchEmail = (params.email || "").trim();
  const claims = await getOmbClaims(searchEmail);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">OMB Claim</p>
        <h1>Review every OMB claim from order verification through screenshot and gift handling.</h1>
        <p>
          This workspace combines the `/om`, `/om2`, and `/om3` steps into one operations view so
          the team can check platform, rating, address, screenshot, gift status, and internal notes
          in a single place.
        </p>
      </div>

      {params.status ? <p className="notice">OMB claim action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Claims</h2>
            <p className="form-note">
              {claims.length} claim{claims.length === 1 ? "" : "s"} found.
            </p>
          </div>
          <form method="get" className="admin-inline-form">
            <div className="field">
              <label htmlFor="email">Search email</label>
              <input
                id="email"
                name="email"
                defaultValue={searchEmail}
                placeholder="customer@example.com"
              />
            </div>
            <button type="submit" className="button button--secondary">
              Search
            </button>
          </form>
        </div>
      </section>

      {claims.length > 0 ? (
        <section className="admin-table admin-table--scroll">
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Platform / Order</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Extra Bottle Address</th>
                <th>Screenshot</th>
                <th>Gift Sent</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const redirectTo = searchEmail
                  ? `/admin/omb-claims?email=${encodeURIComponent(searchEmail)}`
                  : "/admin/omb-claims";
                const formId = `claim-form-${claim.id}`;
                const progressLabel = claim.completedAt
                  ? "Completed"
                  : claim.reviewRating && claim.reviewRating >= 4
                    ? "Waiting for last step"
                    : "Waiting for step 2";

                return (
                  <tr key={claim.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{formatDate(claim.createdAt)}</strong>
                        <span className="form-note">{progressLabel}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{claim.platformLabel}</strong>
                        <span>{claim.orderId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{claim.name}</strong>
                        <span>{claim.email}</span>
                        <span className="form-note">{claim.phone || "No phone"}</span>
                      </div>
                    </td>
                    <td>{claim.purchasedProduct || "Not submitted yet"}</td>
                    <td>
                      {claim.reviewRating ? (
                        <RatingStars rating={claim.reviewRating} size="sm" />
                      ) : (
                        "Not submitted yet"
                      )}
                    </td>
                    <td className="admin-table__clip">
                      {claim.commentText || "No comment submitted yet."}
                    </td>
                    <td className="admin-table__clip">
                      {claim.extraBottleAddress || "No address submitted."}
                    </td>
                    <td>
                      {claim.screenshotName ? (
                        <Link
                          href={`/api/omb-claims/${claim.id}/image`}
                          target="_blank"
                          className="link-inline"
                        >
                          View image
                        </Link>
                      ) : (
                        "No image"
                      )}
                    </td>
                    <td>
                      <label className="admin-table__checkbox-label">
                        <input
                          type="checkbox"
                          name="giftSent"
                          defaultChecked={claim.giftSent}
                          form={formId}
                        />
                        <span>{claim.giftSent ? "Sent" : "Pending"}</span>
                      </label>
                    </td>
                    <td>
                      <textarea
                        className="admin-table__textarea"
                        name="adminNote"
                        defaultValue={claim.adminNote || ""}
                        form={formId}
                      />
                    </td>
                    <td className="admin-table__actions">
                      <form id={formId} action={updateOmbClaimAction}>
                        <input type="hidden" name="id" value={claim.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                      </form>
                      <button type="submit" className="button button--primary" form={formId}>
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="admin-form admin-review-item">
          <h3>No claims found</h3>
          <p>Try a different email search or wait for new OMB submissions to arrive.</p>
        </section>
      )}
    </div>
  );
}
