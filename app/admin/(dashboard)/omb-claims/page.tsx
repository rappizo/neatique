import Link from "next/link";
import { updateOmbClaimAction } from "@/app/admin/actions";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate, formatNumber, formatTime, LOS_ANGELES_TIME_ZONE } from "@/lib/format";
import { getOmbClaimPage } from "@/lib/queries";

type AdminOmbClaimsPageProps = {
  searchParams: Promise<{
    email?: string;
    platform?: string;
    product?: string;
    page?: string;
    status?: string;
  }>;
};

export default async function AdminOmbClaimsPage({ searchParams }: AdminOmbClaimsPageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const claimPage = await getOmbClaimPage(
    Number.isFinite(requestedPage) ? requestedPage : 1,
    50,
    params.email || "",
    params.platform || "",
    params.product || ""
  );
  const {
    claims,
    totalCount,
    completedTodayCount,
    currentPage,
    totalPages,
    pageSize,
    searchEmail,
    searchPlatform,
    searchProduct,
    platformOptions,
    productOptions
  } = claimPage;
  const fromClaim = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toClaim = Math.min(currentPage * pageSize, totalCount);

  function buildPageHref(page: number) {
    const query = new URLSearchParams();
    query.set("page", String(page));

    if (searchEmail) {
      query.set("email", searchEmail);
    }

    if (searchPlatform) {
      query.set("platform", searchPlatform);
    }

    if (searchProduct) {
      query.set("product", searchProduct);
    }

    return `/admin/omb-claims?${query.toString()}`;
  }

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
              Showing {fromClaim} to {toClaim} of {totalCount} claims.
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
            <div className="field">
              <label htmlFor="platform">Platform</label>
              <select id="platform" name="platform" defaultValue={searchPlatform}>
                <option value="">All platforms</option>
                {platformOptions.map((platform) => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="product">Product</label>
              <select id="product" name="product" defaultValue={searchProduct}>
                <option value="">All products</option>
                {productOptions.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="button button--secondary">
              Apply filters
            </button>
            <Link href="/admin/omb-claims" className="button button--secondary">
              Reset
            </Link>
          </form>
        </div>
        <div className="stack-row">
          <span className="pill">
            {formatNumber(completedTodayCount)} completed today (Los Angeles)
          </span>
          {searchPlatform ? <span className="pill">Platform: {platformOptions.find((item) => item.value === searchPlatform)?.label || searchPlatform}</span> : null}
          {searchProduct ? <span className="pill">Product: {searchProduct}</span> : null}
          <span className="pill">Submitted times shown in Los Angeles time</span>
          <span className="pill">50 per page</span>
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
                const redirectTo = buildPageHref(currentPage);
                const formId = `claim-form-${claim.id}`;
                const progressLabel = claim.completedAt
                  ? "Completed"
                  : claim.reviewRating && claim.reviewRating >= 4
                    ? "Waiting for last step"
                    : "Waiting for step 2";
                const submittedAt = claim.completedAt ?? claim.createdAt;

                return (
                  <tr key={claim.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{formatDate(submittedAt, LOS_ANGELES_TIME_ZONE)}</strong>
                        <span>{formatTime(submittedAt, LOS_ANGELES_TIME_ZONE, true)}</span>
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
          <p>Try a different email, platform, or product filter, or wait for new OMB submissions to arrive.</p>
        </section>
      )}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div className="stack-row">
            <Link
              href={currentPage > 1 ? buildPageHref(currentPage - 1) : "#"}
              className={`button button--secondary${currentPage > 1 ? "" : " button--disabled"}`}
              aria-disabled={currentPage <= 1}
            >
              Previous
            </Link>
            <span className="pill">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={currentPage < totalPages ? buildPageHref(currentPage + 1) : "#"}
              className={`button button--secondary${currentPage < totalPages ? "" : " button--disabled"}`}
              aria-disabled={currentPage >= totalPages}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
