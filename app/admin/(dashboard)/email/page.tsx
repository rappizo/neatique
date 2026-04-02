import Link from "next/link";
import { saveEmailSettingsAction, sendAdminMailboxEmailAction } from "@/app/admin/actions";
import { getMailboxOverview } from "@/lib/admin-mailbox";
import { getStoreSettings } from "@/lib/queries";

type AdminEmailPageProps = {
  searchParams: Promise<{
    status?: string;
    uid?: string;
    reply?: string;
    composeTo?: string;
    composeSubject?: string;
    composeBody?: string;
  }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  saved: "Email settings were saved.",
  "mail-sent": "Email was sent successfully.",
  "mail-send-failed": "Email could not be sent. Please review the mailbox or SMTP settings.",
  "send-missing-fields": "To, subject, and message body are required before sending."
};

function toInt(value: string | undefined) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAdminEmailHref(input: {
  uid?: number | null;
  reply?: boolean;
  composeTo?: string;
  composeSubject?: string;
  composeBody?: string;
}) {
  const params = new URLSearchParams();

  if (input.uid && input.uid > 0) {
    params.set("uid", String(input.uid));
  }

  if (input.reply) {
    params.set("reply", "1");
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

  const query = params.toString();
  return query ? `/admin/email?${query}` : "/admin/email";
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

export default async function AdminEmailPage({ searchParams }: AdminEmailPageProps) {
  const [settings, params] = await Promise.all([getStoreSettings(), searchParams]);
  const selectedUid = toInt(params.uid);
  const mailbox = await getMailboxOverview(selectedUid, 30);
  const selectedMessage = mailbox.selectedMessage;
  const isReplying = params.reply === "1";
  const composeTo =
    params.composeTo ||
    (isReplying ? selectedMessage?.replyToEmail || selectedMessage?.fromEmail || "" : "");
  const composeSubject =
    params.composeSubject ||
    (isReplying && selectedMessage ? buildReplySubject(selectedMessage.subject) : "");
  const composeBody =
    params.composeBody ||
    (isReplying && selectedMessage
      ? buildQuotedReplyBody({
          fromName: selectedMessage.fromName,
          fromEmail: selectedMessage.fromEmail,
          receivedAt: selectedMessage.receivedAt,
          textBody: selectedMessage.textBody
        })
      : "");
  const currentViewHref = buildAdminEmailHref({ uid: selectedMessage?.uid ?? selectedUid ?? null });
  const replyHref = selectedMessage
    ? buildAdminEmailHref({
        uid: selectedMessage.uid,
        reply: true
      })
    : null;

  return (
    <div className="admin-page admin-page--email">
      <div className="admin-page__header">
        <p className="eyebrow">Email</p>
        <h1>Manage Tracy&apos;s mailbox from the same admin workspace you already use.</h1>
        <p>
          SMTP continues to power all outgoing site mail. Add IMAP once, then read incoming mail,
          reply from the Neatique mailbox, and keep customer conversations in one place.
        </p>
      </div>

      {params.status && STATUS_MESSAGES[params.status] ? <p className="notice">{STATUS_MESSAGES[params.status]}</p> : null}

      <section className="admin-form">
        <h2>Email delivery and mailbox settings</h2>
        <form action={saveEmailSettingsAction}>
          <div className="admin-mailbox-settings">
            <div className="admin-mailbox-settings__card">
              <div className="stack-row">
                <strong>Outgoing email</strong>
                <span className="pill">SMTP</span>
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
      </section>

      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Mailbox workspace</h2>
            <p className="admin-table__empty">
              Read the inbox live over IMAP, then send or reply through the configured Tracy mailbox.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{mailbox.mailboxName}</span>
            <span className="pill">{mailbox.totalMessages} loaded</span>
            <span className="pill">{mailbox.unreadMessages} unread</span>
            <Link href={currentViewHref} className="button button--secondary">
              Refresh inbox
            </Link>
          </div>
        </div>

        {!mailbox.available ? <p className="notice notice--warning">{mailbox.reason || "Mailbox is not available yet."}</p> : null}

        <div className="admin-mailbox-shell">
          <section className="admin-mailbox-panel">
            <div className="stack-row">
              <h3>Inbox</h3>
              <span className="pill">Latest 30 messages</span>
            </div>
            {mailbox.messages.length > 0 ? (
              <div className="admin-mailbox-list">
                {mailbox.messages.map((message) => {
                  const active = selectedMessage?.uid === message.uid || (!selectedMessage && message.uid === mailbox.messages[0]?.uid);
                  return (
                    <Link
                      key={message.uid}
                      href={buildAdminEmailHref({ uid: message.uid })}
                      className={`admin-mailbox-item${active ? " admin-mailbox-item--active" : ""}`}
                    >
                      <div className="stack-row">
                        <strong>{message.fromName || message.fromEmail || "Unknown sender"}</strong>
                        {message.unread ? <span className="pill">Unread</span> : null}
                      </div>
                      <strong className="admin-mailbox-item__subject">{message.subject}</strong>
                      <span>{message.fromEmail || "No sender email"}</span>
                      <span>{message.receivedAt ? message.receivedAt.toLocaleString("en-US") : "No date"}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="admin-table__empty">No mailbox messages loaded yet.</div>
            )}
          </section>

          <section className="admin-mailbox-panel">
            <div className="stack-row">
              <h3>Selected message</h3>
              {replyHref ? (
                <Link href={replyHref} className="button button--secondary">
                  Reply to this email
                </Link>
              ) : null}
            </div>
            {selectedMessage ? (
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
            ) : (
              <div className="admin-table__empty">
                Select an email from the inbox list after the IMAP connection is available.
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Compose from Tracy&apos;s mailbox</h2>
            <p className="admin-table__empty">
              This uses the same SMTP sender you already configured for the site. Reply-to stays on the mailbox so responses keep coming back here.
            </p>
          </div>
          {selectedMessage ? (
            <Link href={replyHref || buildAdminEmailHref({ uid: selectedMessage.uid })} className="button button--secondary">
              Prefill from selected email
            </Link>
          ) : null}
        </div>
        <form action={sendAdminMailboxEmailAction}>
          <input type="hidden" name="redirectTo" value={currentViewHref} />
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
            <div className="field field--full">
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
