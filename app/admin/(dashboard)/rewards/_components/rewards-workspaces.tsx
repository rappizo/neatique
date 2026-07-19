import Image from "next/image";
import Link from "next/link";
import {
  adjustCustomerPointsAction,
  saveFollowEmailSettingsAction,
  updateMascotRedemptionAction
} from "@/app/admin/actions";
import { RatingStars } from "@/components/ui/rating-stars";
import { FOLLOW_EMAIL_PROCESS_LABELS, FOLLOW_EMAIL_STAGE_LABELS } from "@/lib/follow-emails";
import { formatDate, formatNumber } from "@/lib/format";
import {
  formatShippingCarrierLabel,
  formatTrackingNumbers,
  shippingCarrierOptions
} from "@/lib/order-shipping";
import type {
  CustomerRecord,
  FollowEmailOverviewRecord,
  MascotRedemptionRecord,
  MascotRewardRecord,
  RewardEntryRecord,
  RyoClaimRecord,
  TikTokFollowRewardRecord
} from "@/lib/types";

function formatImageSize(bytes: number) {
  if (bytes < 1024) {
    return `${formatNumber(bytes)} B`;
  }

  return `${formatNumber(Math.round(bytes / 1024))} KB`;
}

export function RewardsStatusNotice({
  status,
  label = "Rewards action"
}: {
  status?: string;
  label?: string;
}) {
  return status ? <p className="notice">{label} completed: {status}.</p> : null;
}

export function RewardWorkspaceLinks() {
  return (
    <section className="admin-form">
      <div className="stack-row">
        <div>
          <h2>Operational queues</h2>
          <p className="form-note">
            RYO completion tracking, TK Follow proof uploads, and mascot redemptions run in their
            own focused workspaces.
          </p>
        </div>
        <div className="stack-row">
          <Link href="/admin/rewards/ryo" className="button button--primary">
            Open RYO
          </Link>
          <Link href="/admin/rewards/tk-follow" className="button button--secondary">
            Open TK Follow
          </Link>
          <Link href="/admin/rewards/redemption" className="button button--secondary">
            Open Redemption
          </Link>
        </div>
      </div>
    </section>
  );
}

export function RyoFollowEmailSection({
  followOverview,
  customerListLabel,
  redirectTo = "/admin/rewards/ryo"
}: {
  followOverview: FollowEmailOverviewRecord;
  customerListLabel: string;
  redirectTo?: string;
}) {
  return (
    <section id="following-email" className="admin-form">
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
            <code>[Customer Email]</code>. These reminders use the Brevo-preferred delivery
            path and keep RYO customers synced to the Brevo customer list.
          </p>
        </div>
        <div className="stack-row">
          <span className="pill">{FOLLOW_EMAIL_PROCESS_LABELS.RYO}</span>
          <span className="pill">{formatNumber(followOverview.totalSentToday)} sent today</span>
          <span className="pill">Customer list: {customerListLabel}</span>
        </div>
      </div>
      <form action={saveFollowEmailSettingsAction} className="admin-follow-email-form">
        <input type="hidden" name="processKey" value="RYO" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
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
                <span className="pill">{formatNumber(template.sentTodayCount)} sent today</span>
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
  );
}

export function MascotRewardsSection({ mascots }: { mascots: MascotRewardRecord[] }) {
  return (
    <section id="mascot-setting" className="admin-form">
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
                <span>{formatNumber(mascot.pointsCost)} pts</span>
              </div>
              <h3>{mascot.name}</h3>
              <p>{mascot.description || "No description yet."}</p>
              <div className="product-card__meta">
                <span>{formatNumber(mascot.redemptionCount ?? 0)} redemptions</span>
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
  );
}

export function ManualPointAdjustmentSection({ customers }: { customers: CustomerRecord[] }) {
  return (
    <section id="point-adjustment" className="admin-table admin-table--scroll">
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
  );
}

export function RyoApprovalQueueSection({
  ryoClaims
}: {
  ryoClaims: RyoClaimRecord[];
}) {
  return (
    <section id="ryo" className="admin-table admin-table--scroll">
      <h2>RYO completion log</h2>
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
            <th>Points earned</th>
            <th>Follow Email Sent</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {ryoClaims.length > 0 ? (
            ryoClaims.map((claim) => {
              const statusLabel = claim.rewardGranted
                ? "Completed"
                : claim.completedAt
                  ? "Completed before auto-award"
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
                      <span className={claim.brevoContact ? "form-note" : "admin-table__empty"}>
                        {claim.brevoContact
                          ? `Brevo synced to ${claim.brevoContact.listName || `list ${claim.brevoContact.brevoListId ?? "unknown"}`} on ${formatDate(claim.brevoContact.lastSyncedAt)}`
                          : "Brevo customer sync pending"}
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
                    <div className="admin-table__cell-stack">
                      {claim.rewardGranted ? (
                        <>
                          <span className="pill">{formatNumber(claim.pointsAwarded)} pts added</span>
                          <span>{formatDate(claim.rewardGrantedAt)}</span>
                        </>
                      ) : claim.completedAt ? (
                        <span className="admin-table__empty">No automatic award recorded</span>
                      ) : (
                        <span className="admin-table__empty">Not earned yet</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__cell-stack">
                      <span className={claim.brevoContact ? "pill" : "admin-table__empty"}>
                        {claim.brevoContact ? "Brevo customer ready" : "Brevo sync pending"}
                      </span>
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
                    </div>
                  </td>
                  <td className="admin-table__clip">
                    {claim.adminNote ? claim.adminNote : <span className="admin-table__empty">No note</span>}
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
  );
}

export function TikTokFollowRewardsSection({
  followRewards
}: {
  followRewards: TikTokFollowRewardRecord[];
}) {
  return (
    <section id="tk-follow" className="admin-table admin-table--scroll">
      <div className="stack-row">
        <div>
          <h2>TK Follow</h2>
          <p className="form-note">
            Customer TikTok follow screenshots, automatic point awards, current customer balances,
            and recent point ledger entries.
          </p>
        </div>
        <span className="pill">{formatNumber(followRewards.length)} uploads</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Uploaded</th>
            <th>Screenshot</th>
            <th>Customer</th>
            <th>TikTok</th>
            <th>Points added</th>
            <th>Total points</th>
            <th>Point ledger</th>
          </tr>
        </thead>
        <tbody>
          {followRewards.length > 0 ? (
            followRewards.map((reward) => {
              const customerName =
                [reward.customerFirstName, reward.customerLastName].filter(Boolean).join(" ") ||
                reward.fullName;
              const imageHref = `/api/tiktok-follow-rewards/${reward.id}/image`;

              return (
                <tr key={reward.id}>
                  <td>{formatDate(reward.createdAt)}</td>
                  <td>
                    <div className="admin-proof-thumbnail">
                      <Link href={imageHref} target="_blank" className="admin-proof-thumbnail__image">
                        <Image
                          src={imageHref}
                          alt={`TikTok follow screenshot from ${reward.fullName}`}
                          width={112}
                          height={112}
                          unoptimized
                        />
                      </Link>
                      <div className="admin-table__cell-stack">
                        <Link href={imageHref} target="_blank" className="link-inline">
                          View full screenshot
                        </Link>
                        <span className="admin-table__empty">
                          {reward.screenshotName} - {formatImageSize(reward.screenshotBytes)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__cell-stack">
                      <strong>{customerName}</strong>
                      <span>{reward.customerEmail}</span>
                      {reward.guestWallet ? (
                        <span className="form-note">Guest wallet · account not created yet</span>
                      ) : null}
                      {reward.email !== reward.customerEmail ? (
                        <span className="form-note">Submitted email: {reward.email}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {reward.tiktokUsername ? (
                      reward.tiktokUsername
                    ) : (
                      <span className="admin-table__empty">Not provided</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-table__cell-stack">
                      <span
                        className={
                          reward.rewardGranted
                            ? "admin-table__status-badge admin-table__status-badge--success"
                            : "admin-table__status-badge admin-table__status-badge--warning"
                        }
                      >
                        {reward.rewardGranted ? "Granted" : "Pending"}
                      </span>
                      <span className="pill">{formatNumber(reward.pointsAwarded)} pts</span>
                      <span>{formatDate(reward.rewardGrantedAt)}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{formatNumber(reward.customerLoyaltyPoints)} pts</strong>
                  </td>
                  <td>
                    {reward.rewardLedger.length > 0 ? (
                      <details className="admin-follow-email-log">
                        <summary>{formatNumber(reward.rewardLedger.length)} recent entries</summary>
                        <div className="admin-table__cell-stack">
                          {reward.rewardLedger.map((entry) => (
                            <div key={entry.id} className="admin-table__cell-stack admin-reward-ledger-item">
                              <div className="stack-row">
                                <span className="pill">{entry.type}</span>
                                <strong>{formatNumber(entry.points)} pts</strong>
                              </div>
                              <span>{formatDate(entry.createdAt)}</span>
                              <span>{entry.note || "No note"}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <span className="admin-table__empty">No point ledger yet</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7}>No TK follow uploads yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function RedemptionRequestsSection({
  redemptions,
  redirectTo = "/admin/rewards/redemption"
}: {
  redemptions: MascotRedemptionRecord[];
  redirectTo?: string;
}) {
  return (
    <section id="redemption" className="admin-table admin-table--scroll">
      <h2>Redemption requests</h2>
      <table>
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Mascot</th>
            <th>Customer</th>
            <th>Verification proof</th>
            <th>Ship to</th>
            <th>Points / Status</th>
            <th>Fulfillment</th>
            <th>Email sent</th>
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
                      <span className="form-note">Account: {redemption.customerEmail}</span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__cell-stack">
                      <div className="admin-redemption-proof">
                        <strong>TK Follow</strong>
                        {redemption.tiktokFollowProof ? (
                          <>
                            <Link
                              href={`/api/tiktok-follow-rewards/${redemption.tiktokFollowProof.id}/image`}
                              target="_blank"
                              className="link-inline"
                            >
                              View screenshot
                            </Link>
                            <span className={redemption.tiktokFollowProof.rewardGranted ? "pill" : "admin-table__empty"}>
                              {redemption.tiktokFollowProof.rewardGranted
                                ? `${formatNumber(redemption.tiktokFollowProof.pointsAwarded)} pts granted`
                                : "Points not granted"}
                            </span>
                            <span className="admin-table__empty">
                              {formatDate(redemption.tiktokFollowProof.createdAt)}
                            </span>
                          </>
                        ) : (
                          <span className="admin-table__empty">No TK screenshot</span>
                        )}
                      </div>
                      <div className="admin-redemption-proof">
                        <strong>RYO</strong>
                        {redemption.ryoProofs.length > 0 ? (
                          redemption.ryoProofs.map((proof) => (
                            <div key={proof.id} className="admin-table__cell-stack">
                              <span>
                                {proof.platformLabel} {proof.orderId}
                              </span>
                              {proof.reviewRating ? <RatingStars rating={proof.reviewRating} size="sm" /> : null}
                              {proof.screenshotName ? (
                                <Link
                                  href={`/api/ryo-claims/${proof.id}/image`}
                                  target="_blank"
                                  className="link-inline"
                                >
                                  View RYO screenshot
                                </Link>
                              ) : (
                                <span className="admin-table__empty">No RYO screenshot</span>
                              )}
                              <span className={proof.rewardGranted ? "pill" : "admin-table__empty"}>
                                {proof.rewardGranted
                                  ? `${formatNumber(proof.pointsAwarded)} pts granted`
                                  : "Points not granted"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="admin-table__empty">No completed RYO</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="admin-table__clip">
                    {[redemption.address1, redemption.address2, redemption.city, redemption.state, redemption.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td>
                    <div className="admin-table__cell-stack">
                      <strong>-{formatNumber(redemption.pointsSpent)} pts</strong>
                      <span
                        className={
                          redemption.status === "FULFILLED"
                            ? "admin-table__status-badge admin-table__status-badge--success"
                            : redemption.status === "CANCELLED"
                              ? "admin-table__status-badge admin-table__status-badge--danger"
                              : "admin-table__status-badge admin-table__status-badge--warning"
                        }
                      >
                        {redemption.status}
                      </span>
                      {redemption.fulfilledAt ? <span>{formatDate(redemption.fulfilledAt)}</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__cell-stack admin-redemption-shipping-fields">
                      <select
                        className="admin-table__select"
                        name="status"
                        defaultValue={redemption.status}
                        form={formId}
                      >
                        <option value="REQUESTED">Requested</option>
                        <option value="FULFILLED">Fulfilled / shipped</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      <select
                        className="admin-table__select"
                        name="shippingCarrier"
                        defaultValue={redemption.shippingCarrier || ""}
                        form={formId}
                      >
                        <option value="">Select carrier</option>
                        {shippingCarrierOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="admin-table__input"
                        name="trackingNumber"
                        defaultValue={redemption.trackingNumber || ""}
                        placeholder="Tracking number"
                        form={formId}
                      />
                      {redemption.shippingCarrier && redemption.trackingNumber ? (
                        <span className="form-note">
                          {formatShippingCarrierLabel(redemption.shippingCarrier)}{" "}
                          {formatTrackingNumbers(redemption.trackingNumber)}
                        </span>
                      ) : (
                        <span className="admin-table__empty">Add carrier + tracking before fulfillment</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {redemption.emailLogs.length > 0 ? (
                      <details className="admin-follow-email-log">
                        <summary>{formatNumber(redemption.emailLogs.length)} emails</summary>
                        <div className="admin-table__cell-stack">
                          {redemption.emailLogs.map((emailLog) => (
                            <div key={emailLog.id} className="admin-table__cell-stack admin-reward-ledger-item">
                              <div className="stack-row">
                                <span
                                  className={
                                    emailLog.deliveryStatus === "SENT"
                                      ? "admin-table__status-badge admin-table__status-badge--success"
                                      : "admin-table__status-badge admin-table__status-badge--danger"
                                  }
                                >
                                  {emailLog.deliveryStatus}
                                </span>
                                <span>{formatDate(emailLog.createdAt)}</span>
                              </div>
                              <strong>{emailLog.subject}</strong>
                              <span>{emailLog.recipientEmail}</span>
                              {emailLog.errorReason ? (
                                <span className="admin-table__empty">{emailLog.errorReason}</span>
                              ) : null}
                              <p>{emailLog.bodyText}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <span className="admin-table__empty">No shipment email yet</span>
                    )}
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
                      <input type="hidden" name="redirectTo" value={redirectTo} />
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
              <td colSpan={10}>No mascot redemption requests yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function RewardsLedgerSection({ rewards }: { rewards: RewardEntryRecord[] }) {
  return (
    <section id="rewards-ledger" className="admin-table">
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
              <td>{formatNumber(reward.points)}</td>
              <td>{reward.note || "No note"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
