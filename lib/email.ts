import nodemailer from "nodemailer";
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
};

function parseBool(value: string | undefined) {
  return value === "true" || value === "1" || value === "on";
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
    imapMailbox: record.imap_mailbox || "INBOX"
  };
}

export async function getEmailSettings() {
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
          "imap_mailbox"
        ]
      }
    }
  });

  const record = settings.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.key] = item.value;
    return accumulator;
  }, {});

  return toEmailSettings(record);
}

function canSendEmail(settings: EmailSettings) {
  return Boolean(
    settings.enabled &&
      settings.smtpHost &&
      settings.smtpPort &&
      settings.smtpUser &&
      settings.smtpPass &&
      settings.fromEmail
  );
}

export async function sendConfiguredEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  const settings = await getEmailSettings();

  if (!canSendEmail(settings)) {
    return { delivered: false, reason: "Email configuration is incomplete." };
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    }
  });

  await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: input.to,
    replyTo: input.replyTo || undefined,
    subject: input.subject,
    text: input.text,
    html: input.html
  });

  return { delivered: true };
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

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    }
  });

  await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: settings.contactRecipient,
    replyTo: input.email,
    subject: `[Contact] ${input.subject}`,
    text: `${input.name} <${input.email}>\n\n${input.message}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">New contact form submission</h2>
        <p><strong>Name:</strong> ${input.name}</p>
        <p><strong>Email:</strong> ${input.email}</p>
        <p><strong>Subject:</strong> ${input.subject}</p>
        <p>${input.message.replace(/\n/g, "<br />")}</p>
      </div>
    `
  });

  await transporter.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: input.email,
    subject: "We received your message",
    text: `Hi ${input.name}, thanks for contacting Neatique. We received your message and will get back to you soon.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2e2825">
        <h2 style="font-family:Georgia,serif;color:#ed7361">Thank you for contacting Neatique</h2>
        <p>Hi ${input.name}, we received your message and our team will follow up soon.</p>
        <p><strong>Your subject:</strong> ${input.subject}</p>
      </div>
    `
  });

  return { delivered: true };
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
