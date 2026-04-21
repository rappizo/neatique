import Link from "next/link";
import {
  saveEmailMarketingSettingsAction
} from "@/app/admin/actions";
import { EmailAudienceActionButtons } from "@/components/admin/email-audience-action-buttons";
import { fetchBrevoSenders, getBrevoSettings } from "@/lib/brevo";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { getEmailMarketingOverview, getStoreSettings } from "@/lib/queries";

type AdminEmailMarketingPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export const dynamic = "force-dynamic";

const STATUS_MESSAGES: Record<string, string> = {
  "settings-saved": "Brevo settings were saved.",
  "audience-sync-complete": "Audience sync completed.",
  "audience-sync-partial": "Audience sync finished with some skipped or failed contacts.",
  "audience-import-complete": "Brevo contacts were imported into the local email audience.",
  "audience-import-partial": "Most Brevo contacts were imported, but a few could not be saved locally.",
  "audience-import-empty": "That Brevo list is empty, so nothing new was imported.",
  "audience-import-failed": "Brevo import failed. Check the API key and list ID, then try again.",
  "brevo-not-configured": "Add a Brevo API key, enable the module, and set a sender before syncing.",
  "missing-list": "This audience does not have a Brevo list ID configured yet.",
  "missing-fields": "Please complete the required campaign fields before saving."
};

function formatRateChip(value: number | null) {
  return value === null ? "Not available" : formatPercent(value);
}

export default async function AdminEmailMarketingPage({
  searchParams
}: AdminEmailMarketingPageProps) {
  const [settings, overview, params] = await Promise.all([
    getStoreSettings(),
    getEmailMarketingOverview(),
    searchParams
  ]);
  const brevoSettings = getBrevoSettings(settings);
  const senderSnapshot =
    brevoSettings.enabled && brevoSettings.apiKeyConfigured
      ? await fetchBrevoSenders(brevoSettings)
      : { senders: [], error: null };
  const activeSenders = senderSnapshot.senders.filter((sender) => sender.active);
  const configuredSenderEmail = (brevoSettings.senderEmail || "").trim().toLowerCase();
  const configuredSenderIsActive = configuredSenderEmail
    ? activeSenders.some((sender) => sender.email === configuredSenderEmail)
    : false;
  const audienceCards = overview.audiences.filter(
    (audience) => audience.key === "NEWSLETTER" || audience.key === "CUSTOMERS" || audience.key === "LEADS"
  );

  return (
    <div className="admin-page admin-page--email-marketing">
      <div className="admin-page__header">
        <p className="eyebrow">Email Marketing</p>
        <h1>Operate Brevo campaigns from one workspace, with reporting, audience sync, and AI drafting in the same flow.</h1>
        <p>
          The page is organized for daily use: check performance first, move into campaigns, keep
          audiences in sync, then manage connection details and AI tooling when you need them.
        </p>
      </div>

      {params.status ? (
        <p className="notice">{STATUS_MESSAGES[params.status] || `Email marketing action completed: ${params.status}.`}</p>
      ) : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Campaign report</h2>
            <p className="form-note">
              Live summary from Brevo for campaigns that already have reporting data.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{formatNumber(overview.campaignReport.trackedCampaignCount)} tracked</span>
            <span className="pill">{formatNumber(overview.campaignReport.sentCampaignCount)} with sends</span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <strong>{formatNumber(overview.campaignReport.totalDelivered)}</strong>
            <span>Delivered</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(overview.campaignReport.totalUniqueViews)}</strong>
            <span>Unique opens</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(overview.campaignReport.totalUniqueClicks)}</strong>
            <span>Unique clicks</span>
          </div>
          <div className="stat-card">
            <strong>{formatRateChip(overview.campaignReport.overallOpenRate)}</strong>
            <span>Overall open rate</span>
          </div>
          <div className="stat-card">
            <strong>{formatRateChip(overview.campaignReport.overallClickRate)}</strong>
            <span>Overall click rate</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(overview.campaignReport.totalUnsubscriptions)}</strong>
            <span>Unsubscribes</span>
          </div>
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Campaigns</h2>
            <p className="form-note">
              Open a draft to edit, preview, sync, send a test, or send through Brevo.
            </p>
          </div>
          <Link href="/admin/email-marketing/new" className="button button--primary">
            Create campaign
          </Link>
        </div>

        {overview.campaigns.length > 0 ? (
          <div className="admin-product-grid">
            {overview.campaigns.map((campaign) => (
              <article key={campaign.id} className="admin-product-card">
                <div className="admin-product-card__body">
                  <div className="product-card__meta">
                    <span>{campaign.status}</span>
                    <span>{campaign.brevoCampaignId ? `Brevo #${campaign.brevoCampaignId}` : "Local draft"}</span>
                  </div>
                  <h3>{campaign.name}</h3>
                  <p>{campaign.subject}</p>
                  <ul className="admin-list">
                    <li>Audience: {campaign.audienceType}</li>
                    <li>Updated: {formatDate(campaign.updatedAt)}</li>
                    <li>Last sync: {campaign.lastSyncedAt ? formatDate(campaign.lastSyncedAt) : "Not synced yet"}</li>
                    <li>Scheduled: {campaign.scheduledAt ? formatDate(campaign.scheduledAt) : "Send manually"}</li>
                    <li>
                      Delivered: {campaign.brevoReport?.stats ? formatNumber(campaign.brevoReport.stats.delivered) : "Not available"}
                    </li>
                    <li>
                      Open rate: {campaign.brevoReport?.stats ? formatRateChip(campaign.brevoReport.stats.opensRate) : "Not available"}
                    </li>
                    <li>
                      Click rate: {campaign.brevoReport?.stats ? formatRateChip(campaign.brevoReport.stats.clickRate) : "Not available"}
                    </li>
                  </ul>
                  <div className="stack-row">
                    <Link href={`/admin/email-marketing/${campaign.id}`} className="button button--primary">
                      Open draft
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-card">
            <h3>No campaigns yet</h3>
            <p>Create the first draft and the team can use AI generation or manual writing before sending through Brevo.</p>
          </div>
        )}
      </section>

      <section className="admin-form">
        <h2>Audience sync</h2>
        <p className="form-note">
          Import existing contacts from Brevo into the local backend, or push the combined site
          audience back to Brevo when new subscribers and customers come in.
        </p>

        <div className="admin-product-grid">
          {audienceCards.map((audience) => (
            <article key={audience.key} className="admin-product-card">
              <div className="admin-product-card__body">
                <div className="product-card__meta">
                  <span>{formatNumber(audience.availableCount)} tracked contacts</span>
                  <span>{audience.targetListId ? `List ${audience.targetListId}` : "List not configured"}</span>
                </div>
                <h3>{audience.label}</h3>
                <p>{audience.description}</p>
                <ul className="admin-list">
                  <li>Site contacts: {formatNumber(audience.localCount)}</li>
                  <li>Imported from Brevo: {formatNumber(audience.importedCount)}</li>
                  <li>
                    Remote Brevo count:{" "}
                    {typeof audience.remoteCount === "number" ? formatNumber(audience.remoteCount) : "Unknown"}
                  </li>
                </ul>

                <EmailAudienceActionButtons
                  audienceType={audience.key}
                  detailHref={`/admin/email-marketing/audience/${audience.key}`}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Brevo connection</h2>
            <p className="form-note">
              Transactional delivery is configured from the Email page. Brevo is preferred there
              when it is ready, while this section controls campaign senders, list IDs, and Brevo
              marketing delivery.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{brevoSettings.enabled ? "Brevo enabled" : "Brevo disabled"}</span>
            <span className="pill">
              API key: {brevoSettings.apiKeyConfigured ? `configured via ${brevoSettings.apiKeySource}` : "missing"}
            </span>
            <span className="pill">
              Sender: {brevoSettings.senderEmail ? brevoSettings.senderEmail : "not ready"}
            </span>
            <span className="pill">
              Active campaign senders: {formatNumber(activeSenders.length)}
            </span>
          </div>
        </div>

        <form action={saveEmailMarketingSettingsAction}>
          <div className="admin-form__grid">
            <label className="field field--checkbox">
              <input type="checkbox" name="brevo_enabled" defaultChecked={(settings.brevo_enabled || "false") === "true"} />
              Enable Brevo marketing sync
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="brevo_sync_subscribe"
                defaultChecked={(settings.brevo_sync_subscribe || "true") === "true"}
              />
              Auto-sync homepage subscribers
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="brevo_sync_contact"
                defaultChecked={(settings.brevo_sync_contact || "false") === "true"}
              />
              Auto-sync contact leads
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="brevo_sync_customers"
                defaultChecked={(settings.brevo_sync_customers || "true") === "true"}
              />
              Auto-sync opted-in customers
            </label>

            <div className="field">
              <label htmlFor="brevo_api_key">Brevo API key</label>
              <input
                id="brevo_api_key"
                name="brevo_api_key"
                type="password"
                placeholder={
                  brevoSettings.apiKeyConfigured
                    ? `Saved (${brevoSettings.apiKeySource}). Leave blank to keep it.`
                    : "Paste your Brevo API key"
                }
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_sender_name">Sender name</label>
              <input
                id="brevo_sender_name"
                name="brevo_sender_name"
                defaultValue={settings.brevo_sender_name || "Neatique Beauty"}
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_sender_email">Sender email</label>
              <input
                id="brevo_sender_email"
                name="brevo_sender_email"
                defaultValue={settings.brevo_sender_email || settings.email_from_address || ""}
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_reply_to">Reply-to email</label>
              <input
                id="brevo_reply_to"
                name="brevo_reply_to"
                defaultValue={settings.brevo_reply_to || settings.contact_recipient || ""}
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_test_email">Test email inbox</label>
              <input
                id="brevo_test_email"
                name="brevo_test_email"
                defaultValue={settings.brevo_test_email || settings.contact_recipient || ""}
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_subscribers_list_id">Subscriber list ID</label>
              <input
                id="brevo_subscribers_list_id"
                name="brevo_subscribers_list_id"
                defaultValue={settings.brevo_subscribers_list_id || ""}
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_contact_list_id">Contact lead list ID</label>
              <input
                id="brevo_contact_list_id"
                name="brevo_contact_list_id"
                defaultValue={settings.brevo_contact_list_id || ""}
              />
            </div>

            <div className="field">
              <label htmlFor="brevo_customers_list_id">Customer list ID</label>
              <input
                id="brevo_customers_list_id"
                name="brevo_customers_list_id"
                defaultValue={settings.brevo_customers_list_id || ""}
              />
            </div>
          </div>

          <div className="stack-row">
            <button type="submit" className="button button--primary">
              Save Brevo settings
            </button>
            <Link href="/admin/email" className="button button--secondary">
              Open email delivery settings
            </Link>
          </div>
        </form>

        {!senderSnapshot.error && configuredSenderEmail && !configuredSenderIsActive ? (
          <p className="notice notice--warning">
            Current sender <strong>{configuredSenderEmail}</strong> is not active for Brevo
            marketing campaigns. Available active senders:{" "}
            {activeSenders.length > 0
              ? activeSenders.map((sender) => sender.email).join(", ")
              : "none returned by Brevo"}.
          </p>
        ) : null}

        {senderSnapshot.error ? (
          <p className="form-note">Brevo sender lookup is temporarily unavailable: {senderSnapshot.error}</p>
        ) : null}

        {senderSnapshot.senders.length > 0 ? (
          <div className="admin-product-grid admin-product-grid--compact">
            {senderSnapshot.senders.map((sender) => (
              <article key={sender.id} className="admin-product-card admin-email-sender-card">
                <div className="admin-product-card__body">
                  <div className="admin-email-sender-card__meta">
                    <span className="eyebrow">Sender ID {sender.id}</span>
                    <span
                      className={`admin-table__status-badge ${sender.active ? "admin-table__status-badge--success" : "admin-table__status-badge--warning"}`}
                    >
                      {sender.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <h3>{sender.name}</h3>
                  <p>{sender.email}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>AI drafting</h2>
            <p className="form-note">
              Build the local campaign shell first, then let AI draft subject lines and body copy
              before your manual review.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{overview.aiReady ? "OpenAI ready" : "OpenAI not configured"}</span>
            <span className="pill">{overview.aiModel ? `Model ${overview.aiModel}` : "Set OPENAI_API_KEY"}</span>
          </div>
        </div>

        <div className="admin-card">
          <h3>Recommended workflow</h3>
          <p>
            Create campaign shell, write the strategy brief, generate with AI, review the copy,
            preview the email, sync to Brevo, send a test, then send or schedule.
          </p>
        </div>
      </section>

      <section className="admin-form">
        <h2>Brevo lists</h2>
        <p className="form-note">
          Use these IDs in the connection section above. This is reference data only, so it lives
          after the operational sections.
        </p>

        {overview.brevoError ? (
          <p className="form-note">
            Brevo list preview is temporarily unavailable: {overview.brevoError}
          </p>
        ) : null}

        {overview.brevoLists.length > 0 ? (
          <div className="admin-product-grid">
            {overview.brevoLists.map((list) => (
              <article key={list.id} className="admin-product-card">
                <div className="admin-product-card__body">
                  <div className="admin-email-sender-card__meta">
                    <span className="eyebrow">List ID {list.id}</span>
                    <span className="pill">{formatNumber(list.totalSubscribers)} contacts</span>
                  </div>
                  <h3>{list.name}</h3>
                  <p>{list.folderName ? `Folder: ${list.folderName}` : "No folder assigned in Brevo."}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-card">
            <h3>No Brevo lists loaded</h3>
            <p>Add the API key and sender details, then save the settings to let the admin load your Brevo lists.</p>
          </div>
        )}
      </section>
    </div>
  );
}
