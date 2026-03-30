import Link from "next/link";
import { saveEmailMarketingSettingsAction, syncBrevoAudienceAction } from "@/app/admin/actions";
import { getBrevoSettings } from "@/lib/brevo";
import { formatDate, formatNumber } from "@/lib/format";
import { getEmailMarketingOverview, getStoreSettings } from "@/lib/queries";

type AdminEmailMarketingPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export const dynamic = "force-dynamic";

const STATUS_MESSAGES: Record<string, string> = {
  "settings-saved": "Brevo settings were saved.",
  "audience-sync-complete": "Audience sync completed.",
  "audience-sync-partial": "Audience sync finished with some skipped or failed contacts.",
  "brevo-not-configured": "Add a Brevo API key, enable the module, and set a sender before syncing.",
  "missing-list": "This audience does not have a Brevo list ID configured yet.",
  "missing-fields": "Please complete the required campaign fields before saving."
};

export default async function AdminEmailMarketingPage({
  searchParams
}: AdminEmailMarketingPageProps) {
  const [settings, overview, params] = await Promise.all([
    getStoreSettings(),
    getEmailMarketingOverview(),
    searchParams
  ]);
  const brevoSettings = getBrevoSettings(settings);
  const audienceCards = overview.audiences.filter(
    (audience) => audience.key === "NEWSLETTER" || audience.key === "CUSTOMERS" || audience.key === "LEADS"
  );

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Email Marketing</p>
        <h1>Run Brevo-powered campaigns from one workspace, with room for AI-assisted content next.</h1>
        <p>
          Version one keeps the system practical: configure Brevo, sync audiences from the site,
          create campaign drafts locally, then push or send them manually when you are ready.
        </p>
      </div>

      {params.status ? (
        <p className="notice">{STATUS_MESSAGES[params.status] || `Email marketing action completed: ${params.status}.`}</p>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(overview.newsletterCount)}</strong>
          <span>Newsletter subscribers</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(overview.optedInCustomerCount)}</strong>
          <span>Opted-in customers</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(overview.leadCount)}</strong>
          <span>Contact leads</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(overview.campaignCount)}</strong>
          <span>Campaign drafts</span>
          <span>
            Synced {formatNumber(overview.syncedCampaignCount)} · Scheduled {formatNumber(overview.scheduledCampaignCount)} · Sent{" "}
            {formatNumber(overview.sentCampaignCount)}
          </span>
        </div>
      </div>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Brevo connection</h2>
            <p className="form-note">
              Keep transactional SMTP on the separate Email page. This section controls marketing
              audiences and campaign delivery through Brevo.
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
              Open SMTP email settings
            </Link>
          </div>
        </form>
      </section>

      <section className="admin-form">
        <h2>Brevo lists</h2>
        <p className="form-note">
          Use these IDs in the fields above. If no lists appear, either the key is missing or the
          Brevo account does not have lists created yet.
        </p>

        {overview.brevoError ? <p className="notice">{overview.brevoError}</p> : null}

        {overview.brevoLists.length > 0 ? (
          <div className="admin-product-grid">
            {overview.brevoLists.map((list) => (
              <article key={list.id} className="admin-product-card">
                <div className="admin-product-card__body">
                  <div className="product-card__meta">
                    <span>List ID {list.id}</span>
                    <span>{formatNumber(list.totalSubscribers)} contacts</span>
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

      <section className="admin-form">
        <h2>Audience sync</h2>
        <p className="form-note">
          Push the existing site audience into Brevo at any time. Auto-sync will keep future
          submissions in step after you enable the toggles above.
        </p>

        <div className="admin-product-grid">
          {audienceCards.map((audience) => (
            <article key={audience.key} className="admin-product-card">
              <div className="admin-product-card__body">
                <div className="product-card__meta">
                  <span>{formatNumber(audience.localCount)} local contacts</span>
                  <span>{audience.targetListId ? `List ${audience.targetListId}` : "List not configured"}</span>
                </div>
                <h3>{audience.label}</h3>
                <p>{audience.description}</p>

                <form action={syncBrevoAudienceAction} className="stack-row">
                  <input type="hidden" name="audienceType" value={audience.key} />
                  <input type="hidden" name="redirectTo" value="/admin/email-marketing" />
                  <button type="submit" className="button button--primary">
                    Sync to Brevo
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Campaigns</h2>
            <p className="form-note">
              Campaigns are stored locally first. Open any draft to edit HTML, test it, sync it to
              Brevo, or schedule/send it manually.
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
                    <li>
                      Scheduled: {campaign.scheduledAt ? formatDate(campaign.scheduledAt) : "Send manually"}
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
            <p>Create the first draft and the team can start with manual review before AI generation is added.</p>
          </div>
        )}
      </section>
    </div>
  );
}
