import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteEmailCampaignAction,
  generateEmailCampaignWithAiAction,
  sendEmailCampaignNowAction,
  sendEmailCampaignTestAction,
  syncEmailCampaignToBrevoAction,
  updateEmailCampaignAction
} from "@/app/admin/actions";
import { EmailCampaignEditorForm } from "@/components/admin/email-campaign-editor-form";
import { fetchBrevoCampaignReportById, fetchBrevoSenders, getBrevoSettings } from "@/lib/brevo";
import { getOpenAiEmailSettings } from "@/lib/openai-email";
import { formatDate, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { getEmailCampaignById, getStoreSettings } from "@/lib/queries";

type AdminEmailCampaignDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export const dynamic = "force-dynamic";

const STATUS_MESSAGES: Record<string, string> = {
  created: "Campaign draft created.",
  updated: "Campaign draft saved.",
  "brevo-synced": "Campaign synced to Brevo.",
  "campaign-sent": "Campaign sent through Brevo.",
  "test-sent": "Brevo test email sent.",
  "brevo-error": "Brevo returned an error. Review the sync message below.",
  "missing-test-email": "Add a test email inbox before sending a test.",
  "missing-fields": "Please complete the required campaign fields before saving.",
  "ai-generated": "AI generated a fresh draft and updated the campaign fields.",
  "ai-missing-brief": "Add a strategy brief before asking AI to draft the campaign.",
  "ai-error": "AI generation failed. Review the message below.",
  deleted: "Campaign deleted."
};

export default async function AdminEmailCampaignDetailPage({
  params,
  searchParams
}: AdminEmailCampaignDetailPageProps) {
  const [{ id }, query, settings] = await Promise.all([params, searchParams, getStoreSettings()]);
  const [campaign] = await Promise.all([getEmailCampaignById(id)]);
  const brevoSettings = getBrevoSettings(settings);
  const openAiSettings = getOpenAiEmailSettings();

  if (!campaign) {
    notFound();
  }

  const senderEmail = (campaign.senderEmail || brevoSettings.senderEmail || "").trim().toLowerCase();
  const senderSnapshot =
    brevoSettings.enabled && brevoSettings.apiKeyConfigured
      ? await fetchBrevoSenders(brevoSettings)
      : { senders: [], error: null };
  const activeSenders = senderSnapshot.senders.filter((sender) => sender.active);
  const senderIsActive = senderEmail ? activeSenders.some((sender) => sender.email === senderEmail) : false;
  const reportSnapshot =
    campaign.brevoCampaignId && brevoSettings.enabled && brevoSettings.apiKeyConfigured
      ? await fetchBrevoCampaignReportById({
          settings: brevoSettings,
          brevoCampaignId: campaign.brevoCampaignId
        })
      : { report: null, error: null };

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/email-marketing" className="button button--secondary">
          Back to email marketing
        </Link>
      </div>

      {query.status ? <p className="notice">{STATUS_MESSAGES[query.status] || `Campaign action completed: ${query.status}.`}</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Campaign report</h2>
            <p className="form-note">
              Live Brevo metrics for this campaign whenever reporting data is available.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">
              Remote: {campaign.brevoCampaignId ? `Brevo #${campaign.brevoCampaignId}` : "Not synced yet"}
            </span>
            <span className="pill">
              Sent at: {reportSnapshot.report?.sentDate ? `${formatDate(reportSnapshot.report.sentDate)} ${formatTime(reportSnapshot.report.sentDate)}` : "Not sent"}
            </span>
          </div>
        </div>

        {reportSnapshot.error ? (
          <p className="form-note">Campaign report is temporarily unavailable: {reportSnapshot.error}</p>
        ) : null}

        <div className="stats-grid">
          <div className="stat-card">
            <strong>{formatNumber(reportSnapshot.report?.stats?.delivered ?? 0)}</strong>
            <span>Delivered</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(reportSnapshot.report?.stats?.uniqueViews ?? 0)}</strong>
            <span>Unique opens</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(reportSnapshot.report?.stats?.uniqueClicks ?? 0)}</strong>
            <span>Unique clicks</span>
          </div>
          <div className="stat-card">
            <strong>{formatPercent(reportSnapshot.report?.stats?.opensRate ?? null)}</strong>
            <span>Open rate</span>
          </div>
          <div className="stat-card">
            <strong>{formatPercent(reportSnapshot.report?.stats?.clickRate ?? null)}</strong>
            <span>Click rate</span>
          </div>
          <div className="stat-card">
            <strong>{formatNumber(reportSnapshot.report?.stats?.unsubscriptions ?? 0)}</strong>
            <span>Unsubscribes</span>
          </div>
        </div>
      </section>

      <EmailCampaignEditorForm
        action={updateEmailCampaignAction}
        mode="edit"
        campaign={campaign}
        defaultSenderName={brevoSettings.senderName}
        defaultSenderEmail={brevoSettings.senderEmail}
        defaultReplyTo={brevoSettings.replyTo}
      />

      <section className="admin-form">
        <h2>AI draft generation</h2>
        <p>
          Use the strategy brief as the source of truth, then let AI draft the subject line,
          preview text, HTML, and plain-text fallback. You can keep editing manually after that.
        </p>

        <div className="stack-row">
          <span className="pill">{openAiSettings.ready ? "OpenAI ready" : "OpenAI not configured"}</span>
          <span className="pill">{openAiSettings.model ? `Model ${openAiSettings.model}` : "Set OPENAI_API_KEY"}</span>
          <span className="pill">{campaign.strategyBrief?.trim() ? "Brief ready" : "Strategy brief missing"}</span>
        </div>

        <form action={generateEmailCampaignWithAiAction} className="admin-card">
          <h3>Generate with AI</h3>
          <p>
            This uses the current campaign name, strategy brief, audience, and active product
            catalog. The result overwrites the subject, preview text, HTML, and plain-text fields.
          </p>
          <input type="hidden" name="id" value={campaign.id} />
          <input type="hidden" name="redirectTo" value={`/admin/email-marketing/${campaign.id}`} />
          <button type="submit" className="button button--primary" disabled={!openAiSettings.ready}>
            Generate AI draft
          </button>
        </form>
      </section>

      <section className="admin-form">
        <h2>Brevo delivery</h2>
        <p>
          Push the draft to Brevo whenever the content changes. Send a test to your inbox, or send
          it now when everything looks ready.
        </p>

        <div className="stack-row">
          <span className="pill">Status: {campaign.status}</span>
          <span className="pill">
            Remote: {campaign.brevoCampaignId ? `Brevo #${campaign.brevoCampaignId}` : "Not synced yet"}
          </span>
          <span className="pill">
            Last sync: {campaign.lastSyncedAt ? `${formatDate(campaign.lastSyncedAt)} ${formatTime(campaign.lastSyncedAt)}` : "Never"}
          </span>
          <span className="pill">
            Last test: {campaign.lastTestedAt ? `${formatDate(campaign.lastTestedAt)} ${formatTime(campaign.lastTestedAt)}` : "Not sent"}
          </span>
          <span className="pill">
            Last send: {campaign.lastSentAt ? `${formatDate(campaign.lastSentAt)} ${formatTime(campaign.lastSentAt)}` : "Not sent"}
          </span>
        </div>

        {campaign.syncError ? <p className="notice">{campaign.syncError}</p> : null}
        {!senderSnapshot.error && senderEmail && !senderIsActive ? (
          <p className="notice notice--warning">
            Current sender <strong>{senderEmail}</strong> is not active for Brevo marketing
            campaigns. Active senders in this account:{" "}
            {activeSenders.length > 0
              ? activeSenders.map((sender) => sender.email).join(", ")
              : "none returned by Brevo"}.
          </p>
        ) : null}
        {senderSnapshot.error ? (
          <p className="form-note">Brevo sender lookup is temporarily unavailable: {senderSnapshot.error}</p>
        ) : null}

        <div className="cards-3">
          <form action={syncEmailCampaignToBrevoAction} className="admin-card">
            <h3>Sync draft</h3>
            <p>Creates or updates the Brevo campaign so the remote draft matches the local record.</p>
            <input type="hidden" name="id" value={campaign.id} />
            <input type="hidden" name="redirectTo" value={`/admin/email-marketing/${campaign.id}`} />
            <button type="submit" className="button button--primary">
              Sync to Brevo
            </button>
          </form>

          <form action={sendEmailCampaignTestAction} className="admin-card">
            <h3>Send test</h3>
            <p>Uses the saved test inbox by default, but you can override it for this send.</p>
            <input type="hidden" name="id" value={campaign.id} />
            <input type="hidden" name="redirectTo" value={`/admin/email-marketing/${campaign.id}`} />
            <div className="field">
              <label htmlFor="testEmail">Test email</label>
              <input id="testEmail" name="testEmail" type="email" defaultValue={brevoSettings.testEmail} />
            </div>
            <button type="submit" className="button button--secondary">
              Send test email
            </button>
          </form>

          <form action={sendEmailCampaignNowAction} className="admin-card">
            <h3>Send now</h3>
            <p>Use this when the campaign is approved and should go out immediately through Brevo.</p>
            <input type="hidden" name="id" value={campaign.id} />
            <input type="hidden" name="redirectTo" value={`/admin/email-marketing/${campaign.id}`} />
            <button type="submit" className="button button--primary">
              Send campaign now
            </button>
          </form>
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Email preview</h2>
            <p className="form-note">
              Preview reflects the latest saved draft. Save your edits first, then use this preview
              to review layout, spacing, and CTA placement before sending a test.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">Subject: {campaign.subject}</span>
            <span className="pill">
              Preview text: {campaign.previewText?.trim() ? campaign.previewText : "Not set"}
            </span>
          </div>
        </div>

        <div className="admin-email-preview">
          <div className="admin-email-preview__meta">
            <p className="eyebrow">Saved campaign preview</p>
            <h3>{campaign.name}</h3>
            <p>
              Sender: {(campaign.senderName || brevoSettings.senderName || "Neatique Beauty").trim()}
              {" <"}
              {(campaign.senderEmail || brevoSettings.senderEmail || "not configured").trim()}
              {">"}
            </p>
            <p>
              Reply-to: {(campaign.replyTo || brevoSettings.replyTo || "Not set").trim() || "Not set"}
            </p>
          </div>

          <div className="admin-email-preview__frame-wrap">
            <iframe
              title={`${campaign.name} email preview`}
              className="admin-email-preview__frame"
              srcDoc={campaign.contentHtml}
              sandbox=""
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="admin-form">
        <h2>Delete campaign</h2>
        <p>Delete the local draft if you want to rebuild the campaign from scratch.</p>
        <form action={deleteEmailCampaignAction}>
          <input type="hidden" name="id" value={campaign.id} />
          <button type="submit" className="button button--ghost">
            Delete {campaign.name}
          </button>
        </form>
      </section>
    </div>
  );
}
