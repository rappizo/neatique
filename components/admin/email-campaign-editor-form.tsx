import { EMAIL_AUDIENCE_OPTIONS } from "@/lib/brevo";
import type { EmailCampaignRecord } from "@/lib/types";

type EmailCampaignEditorFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode: "new" | "edit";
  campaign?: EmailCampaignRecord;
  defaultSenderName?: string;
  defaultSenderEmail?: string;
  defaultReplyTo?: string;
};

function toDateTimeLocalValue(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return date.toISOString().slice(0, 16);
}

export function EmailCampaignEditorForm({
  action,
  mode,
  campaign,
  defaultSenderName = "Neatique Beauty",
  defaultSenderEmail = "",
  defaultReplyTo = ""
}: EmailCampaignEditorFormProps) {
  const isEdit = mode === "edit" && campaign;

  return (
    <section className="admin-form">
      <div className="admin-page__header">
        <p className="eyebrow">Campaign Draft</p>
        <h1>
          {isEdit
            ? "Shape the campaign locally, then push it to Brevo when the draft is ready."
            : "Create a campaign draft that the team can refine now and hand off to AI later."}
        </h1>
        <p>
          Strategy brief, audience, sender, and HTML content all live in one record so the first
          version can be operated manually while staying ready for future AI generation.
        </p>
      </div>

      <form action={action}>
        {isEdit ? <input type="hidden" name="id" value={campaign.id} /> : null}
        {isEdit ? <input type="hidden" name="redirectTo" value={`/admin/email-marketing/${campaign.id}`} /> : null}
        <input type="hidden" name="status" value={campaign?.status || "DRAFT"} />

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="name">Campaign name</label>
            <input id="name" name="name" defaultValue={campaign?.name || ""} required />
          </div>

          <div className="field">
            <label htmlFor="subject">Subject line</label>
            <input id="subject" name="subject" defaultValue={campaign?.subject || ""} required />
          </div>

          <div className="field">
            <label htmlFor="previewText">Preview text</label>
            <input id="previewText" name="previewText" defaultValue={campaign?.previewText || ""} />
          </div>

          <div className="field">
            <label htmlFor="audienceType">Audience</label>
            <select id="audienceType" name="audienceType" defaultValue={campaign?.audienceType || "NEWSLETTER"}>
              {EMAIL_AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="customListIds">Custom Brevo list IDs</label>
            <input
              id="customListIds"
              name="customListIds"
              defaultValue={campaign?.customListIds || ""}
              placeholder="Only used when audience is Custom"
            />
          </div>

          <div className="field">
            <label htmlFor="scheduledAt">Scheduled send</label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(campaign?.scheduledAt)}
            />
          </div>

          <div className="field">
            <label htmlFor="senderName">Sender name</label>
            <input
              id="senderName"
              name="senderName"
              defaultValue={campaign?.senderName || defaultSenderName}
            />
          </div>

          <div className="field">
            <label htmlFor="senderEmail">Sender email</label>
            <input
              id="senderEmail"
              name="senderEmail"
              type="email"
              defaultValue={campaign?.senderEmail || defaultSenderEmail}
            />
          </div>

          <div className="field">
            <label htmlFor="replyTo">Reply-to email</label>
            <input
              id="replyTo"
              name="replyTo"
              type="email"
              defaultValue={campaign?.replyTo || defaultReplyTo}
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="strategyBrief">Strategy brief</label>
            <textarea
              id="strategyBrief"
              name="strategyBrief"
              defaultValue={campaign?.strategyBrief || ""}
              placeholder="Audience angle, launch goal, product focus, offer, timing notes, and any prompt you want future AI generation to follow."
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="contentHtml">HTML content</label>
            <textarea
              id="contentHtml"
              name="contentHtml"
              defaultValue={campaign?.contentHtml || ""}
              placeholder="<html>...</html>"
              required
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="contentText">Plain-text fallback</label>
            <textarea
              id="contentText"
              name="contentText"
              defaultValue={campaign?.contentText || ""}
              placeholder="Optional plain-text version for internal reference."
            />
          </div>
        </div>

        <div className="stack-row">
          <button type="submit" className="button button--primary">
            {isEdit ? "Save draft" : "Create draft"}
          </button>
        </div>
      </form>
    </section>
  );
}
