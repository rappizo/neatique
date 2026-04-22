import nodemailer from "nodemailer";
import { unstable_cache } from "next/cache";
import { ImapFlow } from "imapflow";
import {
  getBrevoSettings,
  hasBrevoTransactionalPrerequisites,
  sendBrevoTransactionalEmail,
  type BrevoSettings
} from "@/lib/brevo";
import { EMAIL_SETTINGS_CACHE_TAG, STORE_SETTINGS_CACHE_TAG } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import {
  getSubscribeCouponDescription,
  SUBSCRIBE_COUPON_CODE,
  SUBSCRIBE_COUPON_PERCENT_OFF
} from "@/lib/subscribe-offer";

type EmailSettings = {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  contactRecipient: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPass: string;
  imapMailbox: string;
  imapSentMailbox: string;
  brevo: BrevoSettings;
};

type EmailSendResult =
  | {
      delivered: true;
      provider: "brevo" | "smtp";
      messageId?: string | null;
      accepted?: string[];
      rejected?: string[];
    }
  | {
      delivered: false;
      reason: string;
      provider?: "brevo" | "smtp" | null;
      stage?: "config" | "verify" | "send";
    };

function parseBool(value: string | undefined) {
  return value === "true" || value === "1" || value === "on";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toEmailSettings(record: Record<string, string>): EmailSettings {
  return {
    enabled: parseBool(record.email_enabled),
    smtpHost: record.smtp_host || "",
    smtpPort: Number.parseInt(record.smtp_port || "587", 10),
    smtpSecure: parseBool(record.smtp_secure),
    smtpUser: record.smtp_user || "",
    smtpPass: record.smtp_pass || "",
    fromName: record.email_from_name || "Neatique Beauty",
    fromEmail: record.email_from_address || "",
    contactRecipient: record.contact_recipient || record.email_from_address || "",
    imapHost: record.imap_host || "",
    imapPort: Number.parseInt(record.imap_port || "993", 10),
    imapSecure: parseBool(record.imap_secure),
    imapUser: record.imap_user || record.smtp_user || "",
    imapPass: record.imap_pass || record.smtp_pass || "",
    imapMailbox: record.imap_mailbox || "INBOX",
    imapSentMailbox: record.imap_sent_mailbox || "Sent",
    brevo: getBrevoSettings(record)
  };
}

const loadEmailSettings = unstable_cache(
  async () => {
    const settings = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: [
            "email_enabled",
            "smtp_host",
            "smtp_port",
            "smtp_secure",
            "smtp_user",
            "smtp_pass",
            "email_from_name",
            "email_from_address",
            "contact_recipient",
            "imap_host",
            "imap_port",
            "imap_secure",
            "imap_user",
            "imap_pass",
            "imap_mailbox",
            "imap_sent_mailbox",
            "brevo_enabled",
            "brevo_api_key",
            "brevo_sender_name",
            "brevo_sender_email",
            "brevo_reply_to",
            "brevo_test_email",
            "brevo_subscribers_list_id",
            "brevo_contact_list_id",
            "brevo_customers_list_id"
          ]
        }
      }
    });

    const record = settings.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.key] = item.value;
      return accumulator;
    }, {});

    return toEmailSettings(record);
  },
  ["email-settings"],
  {
    tags: [EMAIL_SETTINGS_CACHE_TAG, STORE_SETTINGS_CACHE_TAG]
  }
);

export async function getEmailSettings() {
  return loadEmailSettings();
}

function canSendEmail(settings: EmailSettings) {
  return Boolean(
    settings.enabled &&
      (hasBrevoTransactionalPrerequisites(settings.brevo) ||
        (settings.smtpHost &&
          settings.smtpPort &&
          settings.smtpUser &&
          settings.smtpPass &&
          settings.fromEmail))
  );
}

function canSendSmtpEmail(settings: EmailSettings) {
  return Boolean(
    settings.smtpHost &&
      settings.smtpPort &&
      settings.smtpUser &&
      settings.smtpPass &&
      settings.fromEmail
  );
}

function getOutgoingEmailProvider(settings: EmailSettings): "brevo" | "smtp" | null {
  if (!settings.enabled) {
    return null;
  }

  if (hasBrevoTransactionalPrerequisites(settings.brevo)) {
    return "brevo";
  }

  if (canSendSmtpEmail(settings)) {
    return "smtp";
  }

  return null;
}

function createEmailTransport(settings: EmailSettings) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    }
  });
}

function canArchiveSentEmail(settings: EmailSettings) {
  return Boolean(
    settings.imapHost &&
      settings.imapPort &&
      settings.imapUser &&
      settings.imapPass &&
      settings.imapSentMailbox
  );
}

function buildImapClient(settings: EmailSettings) {
  return new ImapFlow({
    host: settings.imapHost,
    port: settings.imapPort,
    secure: settings.imapSecure,
    auth: {
      user: settings.imapUser,
      pass: settings.imapPass
    },
    logger: false,
    emitLogs: false,
    disableAutoIdle: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    maxIdleTime: 60000
  });
}

function encodeMimeHeader(value: string) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return "";
  }

  return /[^\x20-\x7E]/.test(normalized)
    ? `=?UTF-8?B?${Buffer.from(normalized, "utf8").toString("base64")}?=`
    : normalized;
}

function normalizeMimeLineBreaks(value: string) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function toBase64MimeBlock(value: string) {
  const encoded = Buffer.from(normalizeMimeLineBreaks(value), "utf8").toString("base64");
  return encoded.replace(/.{1,76}/g, "$&\r\n").trim();
}

function buildArchivedMimeMessage(input: {
  settings: EmailSettings;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  const boundary = `neatique-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const fromDisplay = input.settings.fromName
    ? `${encodeMimeHeader(input.settings.fromName)} <${input.settings.fromEmail}>`
    : input.settings.fromEmail;
  const headers = [
    `From: ${fromDisplay}`,
    `To: ${input.to}`,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    input.replyTo ? `Reply-To: ${input.replyTo}` : null,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ]
    .filter(Boolean)
    .join("\r\n");

  const textPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toBase64MimeBlock(input.text)
  ].join("\r\n");

  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toBase64MimeBlock(input.html)
  ].join("\r\n");

  const closingBoundary = `--${boundary}--`;

  return `${headers}\r\n\r\n${textPart}\r\n${htmlPart}\r\n${closingBoundary}\r\n`;
}

async function archiveSentEmail(input: {
  settings: EmailSettings;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  if (!canArchiveSentEmail(input.settings)) {
    return;
  }

  const client = buildImapClient(input.settings);
  await client.connect();

  try {
    const rawMessage = buildArchivedMimeMessage(input);
    await client.append(input.settings.imapSentMailbox, rawMessage, ["\\Seen"], new Date());
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore disconnect errors.
    }
  }
}

function sanitizeEmailDiagnosticValue(value: string, maxLength = 220) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength)}...`;
}

function formatEmailTransportError(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Unknown SMTP error.";
  }

  const candidate = error as {
    code?: string;
    message?: string;
    response?: string;
    responseCode?: number;
    command?: string;
  };

  const parts: string[] = [];
  if (candidate.code) {
    parts.push(candidate.code);
  }
  if (typeof candidate.responseCode === "number") {
    parts.push(String(candidate.responseCode));
  }
  if (candidate.command) {
    parts.push(candidate.command);
  }
  if (candidate.response) {
    parts.push(candidate.response);
  } else if (candidate.message) {
    parts.push(candidate.message);
  }

  if (parts.length === 0) {
    return "Unknown SMTP error.";
  }

  return sanitizeEmailDiagnosticValue(parts.join(" | "));
}

async function sendEmailWithTransport(input: {
  settings: EmailSettings;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  const transporter = createEmailTransport(input.settings);

  try {
    const info = await transporter.sendMail({
      from: `"${input.settings.fromName}" <${input.settings.fromEmail}>`,
      to: input.to,
      replyTo: input.replyTo || undefined,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

    if (rejected.length > 0 && accepted.length === 0) {
      return {
        delivered: false,
        stage: "send",
        reason: sanitizeEmailDiagnosticValue(`Recipient rejected: ${rejected.join(", ")}`)
      };
    }

    return {
      delivered: true,
      provider: "smtp",
      accepted,
      rejected
    };
  } catch (error) {
    return {
      delivered: false,
      provider: "smtp",
      stage: "send",
      reason: formatEmailTransportError(error)
    };
  }
}

export async function sendConfiguredEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  const settings = await getEmailSettings();

  if (!canSendEmail(settings)) {
    return { delivered: false, provider: null, stage: "config", reason: "Email configuration is incomplete." };
  }

  const provider = getOutgoingEmailProvider(settings);

  if (!provider) {
    return { delivered: false, provider: null, stage: "config", reason: "No active email delivery provider is configured." };
  }

  const result =
    provider === "brevo"
      ? await (async (): Promise<EmailSendResult> => {
          try {
            const delivery = await sendBrevoTransactionalEmail({
              settings: settings.brevo,
              ...input
            });

            return {
              delivered: true,
              provider: "brevo",
              messageId: delivery.messageId,
              accepted: delivery.accepted,
              rejected: []
            };
          } catch (error) {
            return {
              delivered: false,
              provider: "brevo",
              stage: "send",
              reason: error instanceof Error ? error.message : "Brevo transactional delivery failed."
            };
          }
        })()
      : await sendEmailWithTransport({
          settings,
          ...input
        });

  if (result.delivered) {
    try {
      await archiveSentEmail({
        settings,
        ...input
      });
    } catch (error) {
      console.error("Sent mailbox archive failed:", error);
    }
  }

  return result;
}

export async function sendSmtpDiagnosticEmail(input: {
  to: string;
}): Promise<EmailSendResult> {
  const settings = await getEmailSettings();

  if (!canSendEmail(settings)) {
    return { delivered: false, provider: null, stage: "config", reason: "Email configuration is incomplete." };
  }

  const provider = getOutgoingEmailProvider(settings);
  const sentAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  if (provider === "brevo") {
    const result = await sendConfiguredEmail({
      to: input.to,
      subject: "Neatique delivery test email",
      text: `This is a Brevo delivery test email from the Neatique admin.\n\nSent at: ${sentAt}\nFrom: ${settings.brevo.senderEmail}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.8;color:#2e2825">
          <h2 style="font-family:Georgia,serif;color:#ed7361">Neatique delivery test email</h2>
          <p>This confirms that Brevo transactional email can send from the admin panel.</p>
          <p><strong>Sent at:</strong> ${sentAt}</p>
          <p><strong>From:</strong> ${settings.brevo.senderEmail}</p>
        </div>
      `
    });

    if (!result.delivered) {
      return {
        delivered: false,
        provider: result.provider,
        stage: result.stage || "send",
        reason: result.reason
      };
    }

    return result;
  }

  const transporter = createEmailTransport(settings);

  try {
    await transporter.verify();
  } catch (error) {
    return {
      delivered: false,
      stage: "verify",
      reason: formatEmailTransportError(error)
    };
  }

  return sendEmailWithTransport({
    settings,
    to: input.to,
    subject: "Neatique delivery test email",
    text: `This is a test email from the Neatique admin delivery diagnostic tool.\n\nSent at: ${sentAt}\nFrom: ${settings.fromEmail}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.8;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">Neatique delivery test email</h2>
        <p>This confirms that the saved fallback SMTP settings can authenticate and send a message from the admin panel.</p>
        <p><strong>Sent at:</strong> ${sentAt}</p>
        <p><strong>From:</strong> ${settings.fromEmail}</p>
      </div>
    `
  });
}

export async function sendCustomerWelcomeEmail(input: {
  email: string;
  firstName?: string | null;
  password: string;
}) {
  const name = input.firstName || "there";

  return sendConfiguredEmail({
    to: input.email,
    subject: "Your Neatique account is ready",
    text: `Hi ${name}, your Neatique account has been created. You can sign in with ${input.email} and temporary password ${input.password}.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">Welcome to Neatique</h2>
        <p>Hi ${name}, your account has been created so you can track orders, points, and reviews.</p>
        <p><strong>Login email:</strong> ${input.email}</p>
        <p><strong>Temporary password:</strong> ${input.password}</p>
        <p>You can sign in and update your password anytime from the account center.</p>
      </div>
    `
  });
}

export async function sendContactSubmissionEmails(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const settings = await getEmailSettings();

  if (!canSendEmail(settings) || !settings.contactRecipient) {
    return { delivered: false, reason: "Email configuration is incomplete." };
  }

  const internalResult = await sendConfiguredEmail({
    to: settings.contactRecipient,
    replyTo: input.email,
    subject: `[Contact] ${input.subject}`,
    text: `${input.name} <${input.email}>\n\n${input.message}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
        <p>${escapeHtml(input.message).replace(/\n/g, "<br />")}</p>
      </div>
    `
  });

  if (!internalResult.delivered) {
    return internalResult;
  }

  const customerResult = await sendConfiguredEmail({
    to: input.email,
    subject: "We received your message",
    text: `Hi ${input.name}, thanks for contacting Neatique. We received your message and will get back to you soon.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">Thank you for contacting Neatique</h2>
        <p>Hi ${escapeHtml(input.name)}, we received your message and our team will follow up soon.</p>
        <p><strong>Your subject:</strong> ${escapeHtml(input.subject)}</p>
      </div>
    `
  });

  if (!customerResult.delivered) {
    return customerResult;
  }

  return { delivered: true, accepted: customerResult.accepted };
}

export async function sendSubscriptionCouponEmail(input: {
  email: string;
}) {
  return sendConfiguredEmail({
    to: input.email,
    subject: `${SUBSCRIBE_COUPON_PERCENT_OFF}% off your first Neatique purchase`,
    text: `Welcome to Neatique. Your subscriber offer is ${SUBSCRIBE_COUPON_CODE}. Apply it at checkout for ${getSubscribeCouponDescription()}. If you do not see this email in your inbox, please check your spam or promotions folder.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">Welcome to Neatique</h2>
        <p>Thank you for subscribing. Your welcome offer is ready.</p>
        <p><strong>Coupon code:</strong> ${SUBSCRIBE_COUPON_CODE}</p>
        <p><strong>Offer:</strong> ${getSubscribeCouponDescription()}</p>
        <p>Enter the code at checkout on your first order. If you do not see this email in your inbox, please check your spam or promotions folder.</p>
      </div>
    `
  });
}

export async function sendRyoRewardApprovedEmail(input: {
  email: string;
  firstName?: string | null;
  points: number;
}) {
  const name = input.firstName || "there";

  return sendConfiguredEmail({
    to: input.email,
    subject: "Your Neatique order registration was approved",
    text: `Hi ${name}, we reviewed your Register Your Order submission and added ${input.points} points to your Neatique account. Visit https://neatiquebeauty.com/rd to redeem your mascot once your balance is ready.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">Your RYO submission was approved</h2>
        <p>Hi ${name}, we reviewed your order registration and added <strong>${input.points} points</strong> to your Neatique account.</p>
        <p>You can now visit <a href="https://neatiquebeauty.com/rd" style="color:#ed7361">neatiquebeauty.com/rd</a> to redeem your mascot once your balance is ready.</p>
        <p>Thank you for supporting Neatique.</p>
      </div>
    `
  });
}
