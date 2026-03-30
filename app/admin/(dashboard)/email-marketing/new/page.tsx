import Link from "next/link";
import { createEmailCampaignAction } from "@/app/admin/actions";
import { EmailCampaignEditorForm } from "@/components/admin/email-campaign-editor-form";
import { getBrevoSettings } from "@/lib/brevo";
import { getStoreSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminNewEmailCampaignPage() {
  const settings = await getStoreSettings();
  const brevoSettings = getBrevoSettings(settings);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/email-marketing" className="button button--secondary">
          Back to email marketing
        </Link>
      </div>

      <EmailCampaignEditorForm
        action={createEmailCampaignAction}
        mode="new"
        defaultSenderName={brevoSettings.senderName}
        defaultSenderEmail={brevoSettings.senderEmail}
        defaultReplyTo={brevoSettings.replyTo}
      />
    </div>
  );
}
