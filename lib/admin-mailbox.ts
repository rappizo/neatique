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

export type MailboxFolderKey = "inbox" | "sent";

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
  folder: MailboxFolderKey;
  messages: MailboxMessageSummary[];
  selectedMessage: MailboxMessageDetail | null;
};

function normalizeAddressEntries(addressObject: any): Array<{ name?: string | null; address?: string | null }> {
  if (Array.isArray(addressObject)) {
    return addressObject;
  }

  if (Array.isArray(addressObject?.value)) {
    return addressObject.value;
  }

  return [];
}

function canReadMailbox(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  return Boolean(
    settings.enabled &&
      settings.imapHost &&
      settings.imapPort &&
      settings.imapUser &&
      settings.imapPass
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
  const firstValue = normalizeAddressEntries(addressObject)[0] || null;
  return {
    name: firstValue?.name || null,
    email: firstValue?.address || null
  };
}

function getAddressList(addressObject: any): string[] {
  return normalizeAddressEntries(addressObject)
    .map((item: any) => item?.address || "")
    .map((value: string) => value.trim())
    .filter(Boolean);
}

function mapSummary(message: any): MailboxMessageSummary {
  const from = getPrimaryAddress(message?.envelope?.from || message?.envelope?.sender);
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

function resolveMailboxName(
  settings: Awaited<ReturnType<typeof getEmailSettings>>,
  folder: MailboxFolderKey
) {
  return folder === "sent" ? settings.imapSentMailbox || "Sent" : settings.imapMailbox || "INBOX";
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

export async function getMailboxOverview(input?: {
  selectedUid?: number | null;
  limit?: number;
  folder?: MailboxFolderKey;
}): Promise<MailboxOverview> {
  const settings = await getEmailSettings();
  const folder = input?.folder === "sent" ? "sent" : "inbox";
  const mailboxName = resolveMailboxName(settings, folder);

  if (!canReadMailbox(settings)) {
    return {
      available: false,
      reason: "Add IMAP settings to read this mailbox inside the admin.",
      totalMessages: 0,
      unreadMessages: 0,
      mailboxName,
      folder,
      messages: [],
      selectedMessage: null
    };
  }

  try {
    return await withMailboxClient(settings, async (client) => {
      const targetUid = input?.selectedUid && input.selectedUid > 0 ? input.selectedUid : null;

      if (targetUid && folder === "inbox") {
        const mailboxLock = await client.getMailboxLock(mailboxName);
        try {
          await client.messageFlagsAdd(targetUid, ["\\Seen"], { uid: true, silent: true });
        } catch {
          // Ignore mark-as-read failures here so the message can still open.
        } finally {
          mailboxLock.release();
        }
      }

      const status = await client.status(mailboxName, {
        messages: true,
        unseen: true
      });
      const lock = await client.getMailboxLock(mailboxName);

      try {
        const totalMessages = Number(status.messages || 0);
        const unreadMessages = Number(status.unseen || 0);
        const start = Math.max(1, totalMessages - Math.max(1, input?.limit || 25) + 1);
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
          mailboxName,
          folder,
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
      mailboxName,
      folder,
      messages: [],
      selectedMessage: null
    };
  }
}

export async function updateMailboxReadState(input: { uid: number; unread: boolean; folder?: MailboxFolderKey }) {
  const settings = await getEmailSettings();
  const folder = input.folder === "sent" ? "sent" : "inbox";
  const mailboxName = resolveMailboxName(settings, folder);

  if (!canReadMailbox(settings)) {
    throw new Error("Add IMAP settings before updating mailbox read state.");
  }

  if (!input.uid || input.uid <= 0) {
    throw new Error("Mailbox message UID is required.");
  }

  await withMailboxClient(settings, async (client) => {
    const lock = await client.getMailboxLock(mailboxName);

    try {
      if (input.unread) {
        await client.messageFlagsRemove(input.uid, ["\\Seen"], { uid: true });
      } else {
        await client.messageFlagsAdd(input.uid, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  });
}
