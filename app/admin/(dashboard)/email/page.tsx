import Link from "next/link";
import {
  saveEmailSettingsAction,
  sendAdminMailboxEmailAction,
  sendAdminSmtpTestEmailAction,
  generateAdminMailboxReplyAiAction
} from "@/app/admin/actions";
import { MailboxReadToggleButton } from "@/components/admin/mailbox-read-toggle-button";
import type { MailboxFolderKey } from "@/lib/admin-mailbox";
import { getMailboxOverview } from "@/lib/admin-mailbox";
import { getFormSubmissionById, getStoreSettings } from "@/lib/queries";

type AdminEmailPageProps = {
  searchParams: Promise<{
    status?: string;
    uid?: string;
    reply?: string;
    contactSubmissionId?: string;
    composeTo?: string;
    composeSubject?: string;
    composeBody?: string;
    detail?: string;
    folder?: string;
  }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  saved: "Email settings were saved.",
  "mail-sent": "Email was sent successfully.",
  "mail-send-failed": "Email could not be sent. Review the diagnostic note below.",
  "send-missing-fields": "To, subject, and message body are required before sending.",
  "mail-marked-read": "Message marked as read.",
  "mail-marked-unread": "Message marked as unread.",
  "mailbox-message-missing": "Select a message before changing its read state.",
  "mailbox-update-failed": "Mailbox status could not be updated. Please check the IMAP connection.",
  "ai-reply-generated": "AI reply draft was generated and added to the message box.",
  "ai-reply-failed": "AI reply generation failed. Please try again.",
  "mail-sent-contact-handled": "Email was sent successfully and the contact form was marked as handled.",
  "smtp-test-sent": "Delivery test email was sent successfully.",
  "smtp-test-failed": "Delivery test email failed. Review the diagnostic note below.",
  "smtp-test-missing-email": "Enter a destination email before sending a test message."
};

function toInt(value: string | undefined) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAdminEmailHref(input: {
  uid?: number | null;
  reply?: boolean;
  contactSubmissionId?: string | null;
  composeTo?: string;
  composeSubject?: string;
  composeBody?: string;
  folder?: MailboxFolderKey;
}) {
  const params = new URLSearchParams();

  if (input.uid && input.uid > 0) {
    params.set("uid", String(input.uid));
  }

  if (input.reply) {
    params.set("reply", "1");
  }

  if (input.contactSubmissionId) {
    params.set("contactSubmissionId", input.contactSubmissionId);
  }

  if (input.composeTo) {
    params.set("composeTo", input.composeTo);
  }

  if (input.composeSubject) {
    params.set("composeSubject", input.composeSubject);
  }

  if (input.composeBody) {
    params.set("composeBody", input.composeBody);
  }

  if (input.folder) {
    params.set("folder", input.folder);
  }

  const query = params.toString();
  return query ? `/admin/email?${query}` : "/admin/email";
}

function parseMailboxFolder(value: string | undefined): MailboxFolderKey {
  return value === "sent" ? "sent" : "inbox";
}

function buildReplySubject(subject: string) {
  const trimmed = subject.trim();
  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

function buildQuotedReplyBody(input: {
  fromName: string | null;
  fromEmail: string | null;
  receivedAt: Date | null;
  textBody: string | null;
}) {
  const sender = input.fromName || input.fromEmail || "the sender";
  const timestamp = input.receivedAt ? input.receivedAt.toLocaleString("en-US") : "their earlier message";
  const original = (input.textBody || "").trim();
  const clipped = original.length > 3000 ? `${original.slice(0, 3000)}...` : original;

  return clipped
    ? `\n\n----- Original message from ${sender} (${timestamp}) -----\n${clipped}`
    : `\n\n----- Original message from ${sender} (${timestamp}) -----\n`;
}

function buildContactReplyBody(input: {
  name: string | null;
  email: string;
  subject: string | null;
  message: string | null;
  createdAt: Date;
}) {
  const greetingName = input.name?.trim() || "there";
  const submittedAt = input.createdAt.toLocaleString("en-US");
  const original = (input.message || "").trim();
  const clipped = original.length > 3000 ? `${original.slice(0, 3000)}...` : original;

  return [
    `Hi ${greetingName},`,
    "",
    "Thanks for reaching out to Neatique.",
    "",
    "Best regards,",
    "Tracy",
    "Neatique Team",
    "",
    `----- Original contact message (${submittedAt}) -----`,
    `Email: ${input.email}`,
    `Subject: ${input.subject || "No subject"}`,
    clipped || "No message body was provided."
  ].join("\n");
}

export default async function AdminEmailPage({ searchParams }: AdminEmailPageProps) {
  const [settings, params] = await Promise.all([getStoreSettings(), searchParams]);
  const folder = parseMailboxFolder(params.folder);
  const selectedUid = toInt(params.uid);
  const contactSubmissionId = (params.contactSubmissionId || "").trim();
  const [mailbox, contactSubmission] = await Promise.all([
    getMailboxOverview({ selectedUid, limit: 30, folder }),
    contactSubmissionId ? getFormSubmissionById("contact", contactSubmissionId) : Promise.resolve(null)
  ]);
  const selectedMessage = mailbox.selectedMessage;
  const isReplying = params.reply === "1";
  const composeTo =
    params.composeTo ||
    (isReplying
      ? selectedMessage?.replyToEmail || selectedMessage?.fromEmail || ""
      : contactSubmission?.email || "");
  const composeSubject =
    params.composeSubject ||
    (isReplying && selectedMessage
      ? buildReplySubject(selectedMessage.subject)
      : contactSubmission?.subject?.trim()
        ? buildReplySubject(contactSubmission.subject)
        : "Re: Your message to Neatique");
  const composeBody =
    params.composeBody ||
    (isReplying && selectedMessage
      ? buildQuotedReplyBody({
          fromName: selectedMessage.fromName,
          fromEmail: selectedMessage.fromEmail,
          receivedAt: selectedMessage.receivedAt,
          textBody: selectedMessage.textBody
        })
      : contactSubmission
        ? buildContactReplyBody({
            name: contactSubmission.name,
            email: contactSubmission.email,
            subject: contactSubmission.subject,
            message: contactSubmission.message,
            createdAt: contactSubmission.createdAt
          })
        : "");
  const listHref = buildAdminEmailHref({ folder });
  const inboxHref = buildAdminEmailHref({ folder: "inbox" });
  const sentHref = buildAdminEmailHref({ folder: "sent" });
  const currentViewHref = buildAdminEmailHref({
    uid: selectedMessage?.uid ?? selectedUid ?? null,
    contactSubmissionId: contactSubmission?.id ?? contactSubmissionId ?? null,
    folder
  });
  const replyHref = selectedMessage
    ? buildAdminEmailHref({
        uid: selectedMessage.uid,
        reply: true,
        folder
      })
    : null;
  const hasReplySource = Boolean(selectedMessage || contactSubmission);
  const detailNoticeClass =
    params.status && (params.status.includes("failed") || params.status.includes("missing"))
      ? "notice notice--warning"
      : "notice";

  return (
    <div className="admin-page admin-page--email">
      <div className="admin-page__header">
        <p className="eyebrow">Email</p>
        <h1>Manage Tracy&apos;s mailbox from the same admin workspace you already use.</h1>
        <p>
          Brevo now powers outgoing site mail when it is configured, while IMAP keeps the Tracy
          mailbox readable, reply-ready, and organized in one workspace.
        </p>
      </div>

      {params.status && STATUS_MESSAGES[params.status] ? <p className="notice">{STATUS_MESSAGES[params.status]}</p> : null}
      {params.detail ? <p className={detailNoticeClass}>{params.detail}</p> : null}

      <section className="admin-form">
        <h2>Email delivery and mailbox settings</h2>
        <form action={saveEmailSettingsAction}>
          <div className="admin-mailbox-settings">
            <div className="admin-mailbox-settings__card">
              <div className="stack-row">
                <strong>Outgoing email</strong>
                <span className="pill">Brevo preferred</span>
                <span className="pill">SMTP fallback</span>
              </div>
              <div className="admin-form__grid">
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    name="email_enabled"
                    defaultChecked={(settings.email_enabled || "false") === "true"}
                  />
                  Enable email sending
                </label>
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    name="smtp_secure"
                    defaultChecked={(settings.smtp_secure || "false") === "true"}
                  />
                  Use secure SMTP
                </label>
                <div className="field">
                  <label htmlFor="smtp_host">SMTP host</label>
                  <input id="smtp_host" name="smtp_host" defaultValue={settings.smtp_host || ""} />
                </div>
                <div className="field">
                  <label htmlFor="smtp_port">SMTP port</label>
                  <input id="smtp_port" name="smtp_port" defaultValue={settings.smtp_port || "587"} />
                </div>
                <div className="field">
                  <label htmlFor="smtp_user">SMTP username</label>
                  <input id="smtp_user" name="smtp_user" defaultValue={settings.smtp_user || ""} />
                </div>
                <div className="field">
                  <label htmlFor="smtp_pass">SMTP password</label>
                  <input id="smtp_pass" name="smtp_pass" type="password" defaultValue={settings.smtp_pass || ""} />
                </div>
                <div className="field">
                  <label htmlFor="email_from_name">From name</label>
                  <input
                    id="email_from_name"
                    name="email_from_name"
                    defaultValue={settings.email_from_name || "Neatique Beauty"}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email_from_address">From email</label>
                  <input
                    id="email_from_address"
                    name="email_from_address"
                    defaultValue={settings.email_from_address || ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact_recipient">Contact recipient</label>
                  <input
                    id="contact_recipient"
                    name="contact_recipient"
                    defaultValue={settings.contact_recipient || ""}
                  />
                </div>
              </div>
            </div>

            <div className="admin-mailbox-settings__card">
              <div className="stack-row">
                <strong>Incoming mailbox</strong>
                <span className="pill">IMAP</span>
              </div>
              <p className="admin-table__empty">
                Use the same Tracy mailbox here so the admin can read incoming email and reply from one place.
              </p>
              <div className="admin-form__grid">
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    name="imap_secure"
                    defaultChecked={(settings.imap_secure || "true") === "true"}
                  />
                  Use secure IMAP
                </label>
                <div className="field">
                  <label htmlFor="imap_mailbox">Mailbox folder</label>
                  <input id="imap_mailbox" name="imap_mailbox" defaultValue={settings.imap_mailbox || "INBOX"} />
                </div>
                <div className="field">
                  <label htmlFor="imap_sent_mailbox">Sent folder</label>
                  <input
                    id="imap_sent_mailbox"
                    name="imap_sent_mailbox"
                    defaultValue={settings.imap_sent_mailbox || "Sent"}
                  />
                </div>
                <div className="field">
                  <label htmlFor="imap_host">IMAP host</label>
                  <input id="imap_host" name="imap_host" defaultValue={settings.imap_host || ""} />
                </div>
                <div className="field">
                  <label htmlFor="imap_port">IMAP port</label>
                  <input id="imap_port" name="imap_port" defaultValue={settings.imap_port || "993"} />
                </div>
                <div className="field">
                  <label htmlFor="imap_user">IMAP username</label>
                  <input id="imap_user" name="imap_user" defaultValue={settings.imap_user || settings.smtp_user || ""} />
                </div>
                <div className="field">
                  <label htmlFor="imap_pass">IMAP password</label>
                  <input
                    id="imap_pass"
                    name="imap_pass"
                    type="password"
                    defaultValue={settings.imap_pass || settings.smtp_pass || ""}
                  />
                </div>
              </div>
            </div>
          </div>
          <button type="submit" className="button button--primary">
            Save email settings
          </button>
        </form>
        <div className="admin-mailbox-settings" style={{ marginTop: "1.25rem" }}>
          <div className="admin-mailbox-settings__card">
            <div className="stack-row">
              <strong>Delivery diagnostic test</strong>
              <span className="pill">Saved settings</span>
            </div>
            <p className="admin-table__empty">
              Send a quick test email using the delivery configuration already saved above. Brevo is
              tried first when it is configured, and the fallback SMTP reason is still shown if that
              path is being used instead.
            </p>
            <form action={sendAdminSmtpTestEmailAction}>
              <input type="hidden" name="redirectTo" value={currentViewHref} />
              <div className="admin-form__grid">
                <div className="field field--full">
                  <label htmlFor="smtp_test_email">Test recipient email</label>
                  <input
                    id="smtp_test_email"
                    name="testEmail"
                    type="email"
                    defaultValue={settings.email_from_address || settings.smtp_user || ""}
                    placeholder="Enter the inbox you want to test"
                  />
                </div>
              </div>
              <button type="submit" className="button button--secondary">
                Send test email
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Mailbox workspace</h2>
            <p className="admin-table__empty">
              Review the inbox in a familiar list view, then open a message only when you want to see the full detail or send a reply.
            </p>
          </div>
          <div className="stack-row">
            <Link
              href={inboxHref}
              className={`button ${folder === "inbox" ? "button--primary" : "button--secondary"}`}
            >
              Inbox
            </Link>
            <Link
              href={sentHref}
              className={`button ${folder === "sent" ? "button--primary" : "button--secondary"}`}
            >
              Sent
            </Link>
            <span className="pill">{mailbox.mailboxName}</span>
            <span className="pill">{mailbox.totalMessages} loaded</span>
            <span className="pill">{mailbox.unreadMessages} unread</span>
            <Link href={hasReplySource ? currentViewHref : listHref} className="button button--secondary">
              Refresh inbox
            </Link>
          </div>
        </div>

        {!mailbox.available ? <p className="notice notice--warning">{mailbox.reason || "Mailbox is not available yet."}</p> : null}
        <div className="admin-table admin-table--scroll">
          <div className="stack-row">
            <h3>{folder === "sent" ? "Sent mail" : "Inbox list"}</h3>
            <span className="pill">Latest 30 messages</span>
          </div>
          {mailbox.messages.length > 0 ? (
            <table className="admin-mailbox-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>From</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mailbox.messages.map((message) => {
                  const active = selectedMessage?.uid === message.uid;
                  return (
                    <tr key={message.uid} className={active ? "admin-mailbox-table__row--active" : undefined}>
                      <td>
                        <span className={`admin-table__status-badge ${message.unread ? "admin-table__status-badge--warning" : "admin-table__status-badge--success"}`}>
                          {message.unread ? "Unread" : "Read"}
                        </span>
                      </td>
                      <td>{message.fromName || message.fromEmail || "Unknown sender"}</td>
                      <td>{message.fromEmail || "No sender email"}</td>
                      <td className="admin-table__clip">{message.subject}</td>
                      <td>{message.receivedAt ? message.receivedAt.toLocaleString("en-US") : "No date"}</td>
                      <td>
                        <div className="admin-table__actions">
                          <Link href={buildAdminEmailHref({ uid: message.uid, folder })} className="button button--secondary">
                            Open
                          </Link>
                          <MailboxReadToggleButton
                            uid={message.uid}
                            initialUnread={message.unread}
                            folder={folder}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="admin-table__empty">No mailbox messages loaded yet.</div>
          )}
        </div>
      </section>

      {selectedMessage ? (
      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Selected message</h2>
            <p className="admin-table__empty">
              Opened from the inbox list. Review the message details here, then reply using Tracy&apos;s mailbox below.
            </p>
          </div>
          <div className="stack-row">
            {replyHref ? (
              <Link href={replyHref} className="button button--secondary">
                Reply to this email
              </Link>
            ) : null}
            <Link href={listHref} className="button button--ghost">
              Back to inbox only
            </Link>
          </div>
        </div>

        <div className="admin-mailbox-message">
          <div className="admin-mailbox-message__meta">
            <div>
              <span className="eyebrow">From</span>
              <strong>{selectedMessage.fromName || selectedMessage.fromEmail || "Unknown sender"}</strong>
              <span>{selectedMessage.fromEmail || "No sender email"}</span>
            </div>
            <div>
              <span className="eyebrow">Received</span>
              <strong>{selectedMessage.receivedAt ? selectedMessage.receivedAt.toLocaleString("en-US") : "No date"}</strong>
              <span>{selectedMessage.subject}</span>
            </div>
            <div>
              <span className="eyebrow">Reply-to</span>
              <strong>{selectedMessage.replyToEmail || "Not set"}</strong>
              <span>To: {selectedMessage.toEmails.join(", ") || "Not captured"}</span>
              {selectedMessage.ccEmails.length > 0 ? <span>CC: {selectedMessage.ccEmails.join(", ")}</span> : null}
            </div>
          </div>

          {selectedMessage.textBody ? (
            <article className="admin-mailbox-message__body">
              <pre>{selectedMessage.textBody}</pre>
            </article>
          ) : selectedMessage.htmlBody ? (
            <div className="admin-mailbox-message__html">
              <iframe title={`Email ${selectedMessage.uid}`} srcDoc={selectedMessage.htmlBody} sandbox="" />
            </div>
          ) : (
            <div className="admin-table__empty">This message does not include a readable body.</div>
          )}

          {selectedMessage.attachments.length > 0 ? (
            <div className="admin-mailbox-message__attachments">
              <strong>Attachments</strong>
              <div className="stack-row">
                {selectedMessage.attachments.map((attachment, index) => (
                  <span key={`${attachment.filename || "attachment"}-${index}`} className="pill">
                    {attachment.filename || "Unnamed attachment"}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {contactSubmission ? (
      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Selected contact submission</h2>
            <p className="admin-table__empty">
              This reply was opened from the Contact form workspace. The original message is included below and in the compose box.
            </p>
          </div>
          <div className="stack-row">
            <Link href={`/admin/forms/contact/${contactSubmission.id}`} className="button button--secondary">
              Back to contact submission
            </Link>
          </div>
        </div>

        <div className="admin-mailbox-message">
          <div className="admin-mailbox-message__meta">
            <div>
              <span className="eyebrow">From</span>
              <strong>{contactSubmission.name || contactSubmission.email}</strong>
              <span>{contactSubmission.email}</span>
            </div>
            <div>
              <span className="eyebrow">Submitted</span>
              <strong>{contactSubmission.createdAt.toLocaleString("en-US")}</strong>
              <span>{contactSubmission.subject || "No subject"}</span>
            </div>
            <div>
              <span className="eyebrow">Status</span>
              <strong>{contactSubmission.handled ? "Handled" : "New"}</strong>
              <span>Contact form submission</span>
            </div>
          </div>

          <article className="admin-mailbox-message__body">
            <pre>{contactSubmission.message || "No message body was provided for this contact submission."}</pre>
          </article>
        </div>
      </section>
      ) : null}

      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>{selectedMessage ? "Reply from Tracy&apos;s mailbox" : "Compose from Tracy&apos;s mailbox"}</h2>
            <p className="admin-table__empty">
              This uses the same outgoing delivery setup already configured for the site. Reply-to
              stays on the mailbox so responses keep coming back here, and AI-generated replies
              still reference your recent sent emails to keep tone and structure consistent.
            </p>
          </div>
          {hasReplySource ? (
            <div className="stack-row">
              {selectedMessage ? (
                <Link href={replyHref || buildAdminEmailHref({ uid: selectedMessage.uid })} className="button button--secondary">
                  Prefill from selected email
                </Link>
              ) : contactSubmission ? (
                <Link
                  href={buildAdminEmailHref({ contactSubmissionId: contactSubmission.id })}
                  className="button button--secondary"
                >
                  Prefill from contact form
                </Link>
              ) : null}
              <form action={generateAdminMailboxReplyAiAction} className="admin-mailbox-ai-form">
                <input type="hidden" name="uid" value={selectedMessage?.uid || ""} />
                <input type="hidden" name="contactSubmissionId" value={contactSubmission?.id || ""} />
                <input type="hidden" name="redirectTo" value={currentViewHref} />
                <input
                  type="hidden"
                  name="senderName"
                  value={(settings.email_from_name || "Tracy").trim() || "Tracy"}
                />
                <input
                  type="hidden"
                  name="senderEmail"
                  value={(settings.email_from_address || "support@neatiquebeauty.com").trim() || "support@neatiquebeauty.com"}
                />
                <button type="submit" className="button button--ghost">
                  AI Generated Reply Content
                </button>
              </form>
            </div>
          ) : null}
        </div>
        <form action={sendAdminMailboxEmailAction}>
          <input type="hidden" name="redirectTo" value={currentViewHref} />
          <input type="hidden" name="contactSubmissionId" value={contactSubmission?.id || ""} />
          {selectedMessage ? (
            <>
              <input type="hidden" name="sourceSenderName" value={selectedMessage.fromName || ""} />
              <input type="hidden" name="sourceSenderEmail" value={selectedMessage.fromEmail || ""} />
              <input type="hidden" name="sourceSubject" value={selectedMessage.subject} />
              <input
                type="hidden"
                name="sourceSnippet"
                value={(selectedMessage.textBody || selectedMessage.htmlBody || "").slice(0, 2000)}
              />
            </>
          ) : contactSubmission ? (
            <>
              <input type="hidden" name="sourceSenderName" value={contactSubmission.name || ""} />
              <input type="hidden" name="sourceSenderEmail" value={contactSubmission.email} />
              <input type="hidden" name="sourceSubject" value={contactSubmission.subject || ""} />
              <input
                type="hidden"
                name="sourceSnippet"
                value={(contactSubmission.message || "").slice(0, 2000)}
              />
            </>
          ) : null}
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="compose_to">To</label>
              <input id="compose_to" name="to" defaultValue={composeTo} />
            </div>
            <div className="field">
              <label htmlFor="compose_reply_to">Reply-to</label>
              <input
                id="compose_reply_to"
                name="replyTo"
                defaultValue={settings.email_from_address || ""}
              />
            </div>
            <div className="field field--full field--label-tight">
              <label htmlFor="compose_subject">Subject</label>
              <input id="compose_subject" name="subject" defaultValue={composeSubject} />
            </div>
            <div className="field field--full">
              <label htmlFor="compose_body">Message</label>
              <textarea
                id="compose_body"
                name="body"
                rows={14}
                defaultValue={composeBody}
                placeholder="Write the message you want to send from Tracy's mailbox."
              />
            </div>
          </div>
          <div className="stack-row">
            <button type="submit" className="button button--primary">
              Send email
            </button>
            <Link href={buildAdminEmailHref({ uid: selectedMessage?.uid ?? null })} className="button button--secondary">
              Clear compose fields
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
