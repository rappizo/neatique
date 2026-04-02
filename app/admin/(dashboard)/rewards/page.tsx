import Image from "next/image";
import Link from "next/link";
import {
  adjustCustomerPointsAction,
  approveRyoClaimRewardAction,
  saveFollowEmailSettingsAction,
  updateMascotRedemptionAction
} from "@/app/admin/actions";
import { RatingStars } from "@/components/ui/rating-stars";
import { FOLLOW_EMAIL_PROCESS_LABELS, FOLLOW_EMAIL_STAGE_LABELS } from "@/lib/follow-emails";
import { formatDate } from "@/lib/format";
import {
  getCustomers,
  getFollowEmailOverview,
  getMascotRedemptions,
  getMascotRewards,
  getRewards,
  getRyoClaims
} from "@/lib/queries";

type AdminRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRewardsPage({ searchParams }: AdminRewardsPageProps) {
  const [customers, rewards, mascots, redemptions, ryoClaims, followOverview, params] = await Promise.all([
    getCustomers(),
    getRewards(),
    getMascotRewards(),
    getMascotRedemptions(),
    getRyoClaims(),
    getFollowEmailOverview("RYO"),
    searchParams
  ]);
  const pendingRyoClaims = ryoClaims.filter((claim) => claim.completedAt && !claim.rewardGranted);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points</p>
        <h1>Manage loyalty balances, mascot rewards, redemption requests, and RYO approvals.</h1>
        <p>
          Reward points can be earned and adjusted here, but they are never used as cash discounts.
          They are reserved for mascot redemptions and future loyalty experiences.
        </p>
      </div>

      {params.status ? <p className="notice">Rewards action completed: {params.status}.</p> : null}

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{mascots.filter((mascot) => mascot.active).length}</strong>
          <span>Active mascots</span>
        </div>
        <div className="stat-card">
          <strong>{redemptions.filter((redemption) => redemption.status === "REQUESTED").length}</strong>
          <span>Pending redemptions</span>
        </div>
        <div className="stat-card">
          <strong>{redemptions.filter((redemption) => redemption.status === "FULFILLED").length}</strong>
          <span>Fulfilled redemptions</span>
        </div>
        <div className="stat-card">
          <strong>{pendingRyoClaims.length}</strong>
          <span>RYO waiting for approval</span>
        </div>
      </div>

      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Email Following</h2>
            <p className="form-note">
              Automatically follow up with RYO customers after the selected delay. Shortcodes:
              {" "}
              <code>[Customer Name]</code>
              {" "}
              and
              {" "}
              <code>[Customer Email]</code>.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{FOLLOW_EMAIL_PROCESS_LABELS.RYO}</span>
            <span className="pill">{followOverview.totalSentToday} sent today</span>
          </div>
        </div>
        <form action={saveFollowEmailSettingsAction} className="admin-follow-email-form">
          <input type="hidden" name="processKey" value="RYO" />
          <input type="hidden" name="redirectTo" value="/admin/rewards" />
          <div className="admin-follow-email-form__controls">
            <label className="admin-table__checkbox-label">
              <input type="checkbox" name="enabled" defaultChecked={followOverview.enabled} />
              <span>Enable automatic RYO follow emails</span>
            </label>
            <div className="field">
              <label htmlFor="ryo-delay-minutes">Send after (minutes)</label>
              <input
                id="ryo-delay-minutes"
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
                  <span className="pill">{template.sentTodayCount} sent today</span>
                </div>
                <div className="field">
                  <label htmlFor={`ryo-subject-${template.stageKey}`}>Subject</label>
                  <input
                    id={`ryo-subject-${template.stageKey}`}
                    name={`subject_${template.stageKey}`}
                    defaultValue={template.subject}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`ryo-body-${template.stageKey}`}>Body</label>
                  <textarea
                    id={`ryo-body-${template.stageKey}`}
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
        <div className="stack-row">
          <div>
            <h2>Mascot rewards</h2>
            <p className="form-note">
              Each mascot should normally stay at 1,000 points. Create more mascots here and open a
              card to edit the image, SKU, copy, and availability.
            </p>
          </div>
          <Link href="/admin/rewards/mascots/new" className="button button--primary">
            Create mascot
          </Link>
        </div>

        <div className="admin-product-grid admin-product-grid--compact">
          {mascots.map((mascot) => (
            <article key={mascot.id} className="admin-product-card">
              <div className="admin-product-card__media">
                <Image src={mascot.imageUrl} alt={mascot.name} width={420} height={420} unoptimized />
              </div>
              <div className="admin-product-card__body">
                <div className="product-card__meta">
                  <span>{mascot.sku}</span>
                  <span>{mascot.active ? "ACTIVE" : "INACTIVE"}</span>
                  <span>{mascot.pointsCost} pts</span>
                </div>
                <h3>{mascot.name}</h3>
                <p>{mascot.description || "No description yet."}</p>
                <div className="product-card__meta">
                  <span>{mascot.redemptionCount ?? 0} redemptions</span>
                </div>
                <div className="stack-row">
                  <Link href={`/admin/rewards/mascots/${mascot.id}`} className="button button--primary">
                    Edit
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-table admin-table--scroll">
        <h2>Manual point adjustment</h2>
        <table>
          <thead>
            <tr>
              <th>Customer selector</th>
              <th>Email input</th>
              <th>Current balance</th>
              <th>Adjust by</th>
              <th>Note</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <form id="manual-points-adjustment" action={adjustCustomerPointsAction}>
                  <select id="customerId" name="customerId">
                    <option value="">Select an existing customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.email}
                      </option>
                    ))}
                  </select>
                </form>
              </td>
              <td>
                <input
                  form="manual-points-adjustment"
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  placeholder="or enter customer email"
                />
              </td>
              <td>
                <span className="admin-table__empty">
                  Select a customer or enter an existing customer email, then apply a positive or negative point update.
                </span>
              </td>
              <td>
                <input form="manual-points-adjustment" id="points" name="points" type="number" required />
              </td>
              <td>
                <textarea
                  className="admin-table__textarea"
                  form="manual-points-adjustment"
                  id="note"
                  name="note"
                  defaultValue="Manual loyalty adjustment"
                />
              </td>
              <td className="admin-table__actions">
                <button type="submit" className="button button--primary" form="manual-points-adjustment">
                  Apply adjustment
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="admin-table admin-table--scroll">
        <h2>RYO approval queue</h2>
        <table>
          <thead>
            <tr>
              <th>Submitted</th>
              <th>Platform / Order</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Proof</th>
              <th>Status</th>
              <th>Follow Email Sent</th>
              <th>Note</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ryoClaims.length > 0 ? (
              ryoClaims.map((claim) => {
                const formId = `ryo-claim-${claim.id}`;
                const statusLabel = claim.rewardGranted
                  ? "Approved"
                  : claim.completedAt
                    ? "Waiting for approval"
                    : "In progress";
                const statusClassName = claim.rewardGranted
                  ? "admin-table__status-badge admin-table__status-badge--success"
                  : "admin-table__status-badge admin-table__status-badge--warning";
                const latestFollowEmail = claim.followEmails[0] ?? null;

                return (
                  <tr key={claim.id}>
                    <td>{formatDate(claim.completedAt ?? claim.createdAt)}</td>
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
                        <span className="admin-table__empty">No rating</span>
                      )}
                    </td>
                    <td className="admin-table__clip">
                      {claim.commentText ? claim.commentText : <span className="admin-table__empty">No comment yet.</span>}
                    </td>
                    <td>
                      {claim.screenshotName ? (
                        <Link
                          href={`/api/ryo-claims/${claim.id}/image`}
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
                      <span className={statusClassName}>{statusLabel}</span>
                    </td>
                    <td>
                      {latestFollowEmail ? (
                        <details className="admin-follow-email-log">
                          <summary>Follow email sent</summary>
                          <div className="admin-table__cell-stack">
                            {claim.followEmails.map((emailLog) => (
                              <div key={emailLog.id} className="admin-table__cell-stack">
                                <span className="pill">{FOLLOW_EMAIL_STAGE_LABELS[emailLog.stageKey]}</span>
                                <strong>{emailLog.subject}</strong>
                                <span>{formatDate(emailLog.createdAt)}</span>
                                <p>{emailLog.bodyText}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <span className="admin-table__empty">No follow email sent</span>
                      )}
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
                      <form id={formId} action={approveRyoClaimRewardAction}>
                        <input type="hidden" name="id" value={claim.id} />
                        <input type="hidden" name="redirectTo" value="/admin/rewards" />
                      </form>
                      <button
                        type="submit"
                        className="button button--primary"
                        form={formId}
                        disabled={!claim.completedAt}
                      >
                        {claim.rewardGranted ? "Save note" : `Approve + add ${claim.pointsAwarded} pts`}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11}>No RYO registrations yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="admin-table admin-table--scroll">
        <h2>Redemption requests</h2>
        <table>
          <thead>
            <tr>
              <th>Submitted</th>
              <th>Mascot</th>
              <th>Customer</th>
              <th>Shipping address</th>
              <th>Points spent</th>
              <th>Status</th>
              <th>Note</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.length > 0 ? (
              redemptions.map((redemption) => {
                const formId = `mascot-redemption-${redemption.id}`;

                return (
                  <tr key={redemption.id}>
                    <td>{formatDate(redemption.createdAt)}</td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{redemption.mascotName}</strong>
                        <span>{redemption.mascotSku}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{redemption.fullName}</strong>
                        <span>{redemption.email}</span>
                      </div>
                    </td>
                    <td className="admin-table__clip">
                      {[redemption.address1, redemption.address2, redemption.city, redemption.state, redemption.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td>{redemption.pointsSpent}</td>
                    <td>
                      <label className="admin-table__checkbox-label">
                        <input
                          type="checkbox"
                          name="fulfilled"
                          defaultChecked={redemption.status === "FULFILLED"}
                          form={formId}
                        />
                        <span>{redemption.status}</span>
                      </label>
                    </td>
                    <td>
                      <textarea
                        className="admin-table__textarea"
                        name="adminNote"
                        defaultValue={redemption.adminNote || ""}
                        form={formId}
                      />
                    </td>
                    <td className="admin-table__actions">
                      <form id={formId} action={updateMascotRedemptionAction}>
                        <input type="hidden" name="id" value={redemption.id} />
                        <input type="hidden" name="redirectTo" value="/admin/rewards" />
                      </form>
                      <button type="submit" className="button button--primary" form={formId}>
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>No mascot redemption requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="admin-table">
        <h2>Rewards ledger</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Points</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id}>
                <td>{formatDate(reward.createdAt)}</td>
                <td>{reward.customerEmail}</td>
                <td>{reward.type}</td>
                <td>{reward.points}</td>
                <td>{reward.note || "No note"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
