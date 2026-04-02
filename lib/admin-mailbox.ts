import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getEmailSettings } from "@/lib/email";

export type MailboxMessageSummary = {
  uid: number;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  replyToEmail: string | null;
  receivedAt: Date | null;
  unread: boolean;
};

export type MailboxMessageDetail = MailboxMessageSummary & {
  toEmails: string[];
  ccEmails: string[];
  textBody: string | null;
  htmlBody: string | null;
  attachments: Array<{
    filename: string | null;
    contentType: string | null;
    size: number | null;
  }>;
};

export type MailboxOverview = {
  available: boolean;
  reason: string | null;
  totalMessages: number;
  unreadMessages: number;
  mailboxName: string;
  messages: MailboxMessageSummary[];
  selectedMessage: MailboxMessageDetail | null;
};

function canReadMailbox(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  return Boolean(
    settings.enabled &&
      settings.imapHost &&
      settings.imapPort &&
      settings.imapUser &&
      settings.imapPass &&
      settings.imapMailbox
  );
}

function buildImapClient(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
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

function getPrimaryAddress(addressObject: any): { name: string | null; email: string | null } {
  const firstValue = Array.isArray(addressObject?.value) ? addressObject.value[0] : null;
  return {
    name: firstValue?.name || null,
    email: firstValue?.address || null
  };
}

function getAddressList(addressObject: any): string[] {
  return Array.isArray(addressObject?.value)
    ? addressObject.value
        .map((item: any) => item?.address || "")
        .map((value: string) => value.trim())
        .filter(Boolean)
    : [];
}

function mapSummary(message: any): MailboxMessageSummary {
  const from = getPrimaryAddress(message?.envelope?.from);
  const replyTo = getPrimaryAddress(message?.envelope?.replyTo);

  return {
    uid: Number(message?.uid || 0),
    subject: (message?.envelope?.subject || "No subject").trim() || "No subject",
    fromName: from.name,
    fromEmail: from.email,
    replyToEmail: replyTo.email || from.email,
    receivedAt: message?.internalDate ? new Date(message.internalDate) : null,
    unread: !(Array.isArray(message?.flags) && message.flags.includes("\\Seen"))
  };
}

async function withMailboxClient<T>(
  settings: Awaited<ReturnType<typeof getEmailSettings>>,
  run: (client: ImapFlow) => Promise<T>
) {
  const client = buildImapClient(settings);
  await client.connect();

  try {
    return await run(client);
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore disconnect errors from remote mailbox servers.
    }
  }
}

export async function getMailboxOverview(selectedUid?: number | null, limit = 25): Promise<MailboxOverview> {
  const settings = await getEmailSettings();

  if (!canReadMailbox(settings)) {
    return {
      available: false,
      reason: "Add IMAP settings to read this mailbox inside the admin.",
      totalMessages: 0,
      unreadMessages: 0,
      mailboxName: settings.imapMailbox || "INBOX",
      messages: [],
      selectedMessage: null
    };
  }

  try {
    return await withMailboxClient(settings, async (client) => {
      const status = await client.status(settings.imapMailbox, {
        messages: true,
        unseen: true
      });
      const lock = await client.getMailboxLock(settings.imapMailbox);

      try {
        const totalMessages = Number(status.messages || 0);
        const unreadMessages = Number(status.unseen || 0);
        const start = Math.max(1, totalMessages - Math.max(1, limit) + 1);
        const messages: MailboxMessageSummary[] = [];

        if (totalMessages > 0) {
          for await (const message of client.fetch(
            `${start}:${totalMessages}`,
            {
              uid: true,
              envelope: true,
              flags: true,
              internalDate: true
            },
            { uid: true }
          )) {
            messages.push(mapSummary(message));
          }
        }

        messages.sort((left, right) => right.uid - left.uid);

        let selectedMessage: MailboxMessageDetail | null = null;
        const targetUid = selectedUid && selectedUid > 0 ? selectedUid : messages[0]?.uid;

        if (targetUid) {
          const message = (await client.fetchOne(
            targetUid,
            {
              uid: true,
              envelope: true,
              flags: true,
              internalDate: true,
              source: true
            },
            { uid: true }
          )) as (Record<string, any> & { source?: Buffer | Uint8Array | null }) | false;

          if (message && message.source) {
            const parsed = await simpleParser(Buffer.from(message.source));
            const summary = mapSummary(message);

            selectedMessage = {
              ...summary,
              toEmails: getAddressList(parsed.to),
              ccEmails: getAddressList(parsed.cc),
              textBody: parsed.text?.trim() || null,
              htmlBody: typeof parsed.html === "string" ? parsed.html : null,
              attachments: parsed.attachments.map((attachment) => ({
                filename: attachment.filename || null,
                contentType: attachment.contentType || null,
                size: typeof attachment.size === "number" && Number.isFinite(attachment.size) ? attachment.size : null
              }))
            };
          }
        }

        return {
          available: true,
          reason: null,
          totalMessages,
          unreadMessages,
          mailboxName: settings.imapMailbox,
          messages,
          selectedMessage
        };
      } finally {
        lock.release();
      }
    });
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : "Mailbox connection failed.",
      totalMessages: 0,
      unreadMessages: 0,
      mailboxName: settings.imapMailbox || "INBOX",
      messages: [],
      selectedMessage: null
    };
  }
}
