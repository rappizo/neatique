import Link from "next/link";
import { saveFollowEmailSettingsAction, updateOmbClaimAction } from "@/app/admin/actions";
import { RatingStars } from "@/components/ui/rating-stars";
import { FOLLOW_EMAIL_PROCESS_LABELS, FOLLOW_EMAIL_STAGE_LABELS } from "@/lib/follow-emails";
import { formatDate, formatNumber, formatTime, LOS_ANGELES_TIME_ZONE } from "@/lib/format";
import { getFollowEmailOverview, getOmbClaimPage } from "@/lib/queries";

const OMB_UNSUBMITTED_PRODUCT_FILTER = "__NOT_SUBMITTED__";

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
  const [claimPage, followOverview] = await Promise.all([
    getOmbClaimPage(
      Number.isFinite(requestedPage) ? requestedPage : 1,
      50,
      params.email || "",
      params.platform || "",
      params.product || ""
    ),
    getFollowEmailOverview("OMB")
  ]);
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

  function getProductFilterLabel(value: string) {
    return value === OMB_UNSUBMITTED_PRODUCT_FILTER ? "Not submitted yet" : value;
  }

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
        <div className="stack-row">
          <div>
            <h2>Email Following</h2>
            <p className="form-note">
              Automatically follow up with OMB customers after the selected delay. Shortcodes:
              {" "}
              <code>[Customer Name]</code>
              {" "}
              and
              {" "}
              <code>[Customer Email]</code>.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{FOLLOW_EMAIL_PROCESS_LABELS.OMB}</span>
            <span className="pill">{formatNumber(followOverview.totalSentToday)} sent today</span>
          </div>
        </div>
        <form action={saveFollowEmailSettingsAction} className="admin-follow-email-form">
          <input type="hidden" name="processKey" value="OMB" />
          <input type="hidden" name="redirectTo" value="/admin/omb-claims" />
          <div className="admin-follow-email-form__controls">
            <label className="admin-table__checkbox-label">
              <input type="checkbox" name="enabled" defaultChecked={followOverview.enabled} />
              <span>Enable automatic OMB follow emails</span>
            </label>
            <div className="field">
              <label htmlFor="omb-delay-minutes">Send after (minutes)</label>
              <input
                id="omb-delay-minutes"
                name="delayMinutes"
                type="number"
                min={1}
                defaultValue={followOverview.delayMinutes}
              />
            </div>
          </div>
          <div className="admin-follow-email-grid">
            {followOverview.templates.map((template) => (
              <article key={template.stageKey} className="admin-follow-email-card">
                <div className="stack-row">
                  <strong>{template.stageLabel}</strong>
                  <span className="pill">{formatNumber(template.sentTodayCount)} sent today</span>
                </div>
                <div className="field">
                  <label htmlFor={`omb-subject-${template.stageKey}`}>Subject</label>
                  <input
                    id={`omb-subject-${template.stageKey}`}
                    name={`subject_${template.stageKey}`}
                    defaultValue={template.subject}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`omb-body-${template.stageKey}`}>Body</label>
                  <textarea
                    id={`omb-body-${template.stageKey}`}
                    name={`body_${template.stageKey}`}
                    rows={8}
                    defaultValue={template.bodyText}
                  />
                </div>
              </article>
            ))}
          </div>
          <button type="submit" className="button button--primary">
            Save email following settings
          </button>
        </form>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Claims</h2>
            <p className="form-note">
              Showing {fromClaim} to {toClaim} of {totalCount} claims.
            </p>
          </div>
        </div>
        <form method="get" className="omb-claim-filters">
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
                    {getProductFilterLabel(product)}
                  </option>
                ))}
              </select>
            </div>
          <div className="omb-claim-filters__actions">
            <button type="submit" className="button button--primary">
              Apply filters
            </button>
            <Link href="/admin/omb-claims" className="button button--secondary">
              Reset
            </Link>
          </div>
        </form>
        <div className="stack-row">
          <span className="pill">
            {formatNumber(completedTodayCount)} completed today (Los Angeles)
          </span>
          {searchPlatform ? (
            <span className="pill">
              Platform: {platformOptions.find((item) => item.value === searchPlatform)?.label || searchPlatform}
            </span>
          ) : null}
          {searchProduct ? <span className="pill">Product: {getProductFilterLabel(searchProduct)}</span> : null}
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
                <th>Gift/Email Sent</th>
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
                const progressClassName = claim.completedAt
                  ? "admin-table__status-badge admin-table__status-badge--success"
                  : "admin-table__status-badge admin-table__status-badge--warning";
                const submittedAt = claim.completedAt ?? claim.createdAt;
                const latestFollowEmail = claim.followEmails[0] ?? null;

                return (
                  <tr key={claim.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{formatDate(submittedAt, LOS_ANGELES_TIME_ZONE)}</strong>
                        <span>{formatTime(submittedAt, LOS_ANGELES_TIME_ZONE, true)}</span>
                        <span className={progressClassName}>{progressLabel}</span>
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
                        <span className={claim.phone ? "form-note" : "admin-table__empty"}>
                          {claim.phone || "No phone"}
                        </span>
                      </div>
                    </td>
                    <td>
                      {claim.purchasedProduct ? (
                        claim.purchasedProduct
                      ) : (
                        <span className="admin-table__empty">Not submitted yet</span>
                      )}
                    </td>
                    <td>
                      {claim.reviewRating ? (
                        <RatingStars rating={claim.reviewRating} size="sm" />
                      ) : (
                        <span className="admin-table__empty">Not submitted yet</span>
                      )}
                    </td>
                    <td className="admin-table__clip">
                      {claim.commentText ? (
                        claim.commentText
                      ) : (
                        <span className="admin-table__empty">No comment submitted yet.</span>
                      )}
                    </td>
                    <td className="admin-table__clip">
                      {claim.extraBottleAddress ? (
                        claim.extraBottleAddress
                      ) : (
                        <span className="admin-table__empty">No address submitted.</span>
                      )}
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
                        <span className="admin-table__empty">No image</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <label className="admin-table__checkbox-label">
                          <input
                            type="checkbox"
                            name="giftSent"
                            defaultChecked={claim.giftSent}
                            form={formId}
                          />
                          <span>{claim.giftSent ? "Gift sent" : "Gift pending"}</span>
                        </label>
                        {latestFollowEmail ? (
                          <details className="admin-follow-email-log">
                            <summary>Follow email sent</summary>
                            <div className="admin-table__cell-stack">
                              {claim.followEmails.map((emailLog) => (
                                <div key={emailLog.id} className="admin-table__cell-stack">
                                  <span className="pill">
                                    {FOLLOW_EMAIL_STAGE_LABELS[emailLog.stageKey]}
                                  </span>
                                  <strong>{emailLog.subject}</strong>
                                  <span>
                                    {formatDate(emailLog.createdAt, LOS_ANGELES_TIME_ZONE)}
                                    {" "}
                                    {formatTime(emailLog.createdAt, LOS_ANGELES_TIME_ZONE, true)}
                                  </span>
                                  <p>{emailLog.bodyText}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <span className="admin-table__empty">No follow email sent</span>
                        )}
                      </div>
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
          <h3 className="admin-table__empty">No claims found</h3>
          <p className="admin-table__empty">
            Try a different email, platform, or product filter, or wait for new OMB submissions to arrive.
          </p>
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
