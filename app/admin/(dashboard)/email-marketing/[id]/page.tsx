import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteEmailCampaignAction,
  sendEmailCampaignNowAction,
  sendEmailCampaignTestAction,
  syncEmailCampaignToBrevoAction,
  updateEmailCampaignAction
} from "@/app/admin/actions";
import { EmailCampaignEditorForm } from "@/components/admin/email-campaign-editor-form";
import { getBrevoSettings } from "@/lib/brevo";
import { formatDate, formatTime } from "@/lib/format";
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
  deleted: "Campaign deleted."
};

export default async function AdminEmailCampaignDetailPage({
  params,
  searchParams
}: AdminEmailCampaignDetailPageProps) {
  const [{ id }, query, settings] = await Promise.all([params, searchParams, getStoreSettings()]);
  const [campaign] = await Promise.all([getEmailCampaignById(id)]);
  const brevoSettings = getBrevoSettings(settings);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/email-marketing" className="button button--secondary">
          Back to email marketing
        </Link>
      </div>

      {query.status ? <p className="notice">{STATUS_MESSAGES[query.status] || `Campaign action completed: ${query.status}.`}</p> : null}

      <EmailCampaignEditorForm
        action={updateEmailCampaignAction}
        mode="edit"
        campaign={campaign}
        defaultSenderName={brevoSettings.senderName}
        defaultSenderEmail={brevoSettings.senderEmail}
        defaultReplyTo={brevoSettings.replyTo}
      />

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
