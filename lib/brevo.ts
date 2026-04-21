import { siteConfig } from "@/lib/site-config";
import type {
  BrevoCampaignReportRecord,
  BrevoListRecord,
  EmailAudienceType,
  EmailCampaignRecord,
  StoreSettingsRecord
} from "@/lib/types";

const BREVO_API_BASE_URL = process.env.BREVO_API_BASE_URL || "https://api.brevo.com/v3";

export const EMAIL_AUDIENCE_OPTIONS: Array<{
  value: EmailAudienceType;
  label: string;
  description: string;
}> = [
  {
    value: "NEWSLETTER",
    label: "Newsletter subscribers",
    description: "Homepage subscribers and future welcome-offer signups."
  },
  {
    value: "CUSTOMERS",
    label: "Opted-in customers",
    description: "Customers who explicitly enabled marketing email."
  },
  {
    value: "LEADS",
    label: "Contact leads",
    description: "People who reached out through the Contact form."
  },
  {
    value: "ALL_MARKETING",
    label: "All marketing audiences",
    description: "Combines the configured subscriber, customer, and lead lists."
  },
  {
    value: "CUSTOM",
    label: "Custom Brevo lists",
    description: "Use one or more explicit Brevo list IDs for this campaign."
  }
];

export type BrevoSettings = {
  enabled: boolean;
  syncSubscribe: boolean;
  syncContact: boolean;
  syncCustomers: boolean;
  apiKey: string;
  apiKeyConfigured: boolean;
  apiKeySource: "env" | "database" | "missing";
  senderName: string;
  senderEmail: string;
  replyTo: string;
  testEmail: string;
  subscribersListId: number | null;
  contactListId: number | null;
  customersListId: number | null;
};

type BrevoRequestInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

function parseBool(value: string | undefined) {
  return value === "true";
}

export function parseBrevoListIds(value: string | null | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\s,]+/)
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  );
}

function parseSingleBrevoListId(value: string | undefined) {
  return parseBrevoListIds(value)[0] ?? null;
}

export function getBrevoSettings(settings: StoreSettingsRecord): BrevoSettings {
  const envApiKey = (process.env.BREVO_API_KEY || "").trim();
  const storedApiKey = (settings.brevo_api_key || "").trim();
  const apiKey = envApiKey || storedApiKey;

  return {
    enabled: parseBool(settings.brevo_enabled || "false"),
    syncSubscribe: parseBool(settings.brevo_sync_subscribe || "true"),
    syncContact: parseBool(settings.brevo_sync_contact || "false"),
    syncCustomers: parseBool(settings.brevo_sync_customers || "true"),
    apiKey,
    apiKeyConfigured: Boolean(apiKey),
    apiKeySource: envApiKey ? "env" : storedApiKey ? "database" : "missing",
    senderName: (settings.brevo_sender_name || settings.email_from_name || siteConfig.name).trim(),
    senderEmail: (settings.brevo_sender_email || settings.email_from_address || "").trim(),
    replyTo: (settings.brevo_reply_to || settings.contact_recipient || settings.support_email || "").trim(),
    testEmail: (settings.brevo_test_email || settings.contact_recipient || settings.support_email || "").trim(),
    subscribersListId: parseSingleBrevoListId(settings.brevo_subscribers_list_id),
    contactListId: parseSingleBrevoListId(settings.brevo_contact_list_id),
    customersListId: parseSingleBrevoListId(settings.brevo_customers_list_id)
  };
}

export function getEmailAudienceMeta(audienceType: EmailAudienceType) {
  return EMAIL_AUDIENCE_OPTIONS.find((option) => option.value === audienceType) || EMAIL_AUDIENCE_OPTIONS[0];
}

export function resolveAudienceListIds(
  audienceType: EmailAudienceType,
  settings: BrevoSettings,
  customListIds?: string | null
) {
  switch (audienceType) {
    case "NEWSLETTER":
      return settings.subscribersListId ? [settings.subscribersListId] : [];
    case "CUSTOMERS":
      return settings.customersListId ? [settings.customersListId] : [];
    case "LEADS":
      return settings.contactListId ? [settings.contactListId] : [];
    case "ALL_MARKETING":
      return Array.from(
        new Set(
          [settings.subscribersListId, settings.customersListId, settings.contactListId].filter(
            (value): value is number => typeof value === "number"
          )
        )
      );
    case "CUSTOM":
      return parseBrevoListIds(customListIds);
    default:
      return [];
  }
}

export function hasBrevoCampaignPrerequisites(settings: BrevoSettings) {
  return settings.enabled && settings.apiKeyConfigured && Boolean(settings.senderEmail);
}

export function hasBrevoTransactionalPrerequisites(settings: BrevoSettings) {
  return settings.apiKeyConfigured && Boolean(settings.senderEmail);
}

function parseBrevoRecipientEmails(value: string | string[]) {
  const rawItems = Array.isArray(value) ? value : value.split(/[,;\n]+/);

  return Array.from(
    new Set(
      rawItems
        .map((item) => item.trim())
        .map((item) => {
          const emailMatch = item.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
          return emailMatch ? emailMatch[0].toLowerCase() : "";
        })
        .filter(Boolean)
    )
  ).slice(0, 25);
}

function buildBrevoHeaders(settings: BrevoSettings, headers?: Record<string, string>) {
  return {
    accept: "application/json",
    "api-key": settings.apiKey,
    ...(headers || {})
  };
}

async function brevoRequest<T = unknown>(
  settings: BrevoSettings,
  path: string,
  init: BrevoRequestInit = {}
) {
  if (!settings.apiKeyConfigured) {
    throw new Error("Brevo API key is not configured.");
  }

  const response = await fetch(`${BREVO_API_BASE_URL}${path}`, {
    ...init,
    headers: buildBrevoHeaders(settings, init.headers),
    cache: "no-store"
  });

  const rawText = await response.text();
  const data = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : null) ||
      (data && typeof data === "object" && "code" in data && typeof data.code === "string"
        ? data.code
        : null) ||
      `Brevo request failed with ${response.status}.`;

    throw new Error(message);
  }

  return data as T;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function sendBrevoTransactionalEmail(input: {
  settings: BrevoSettings;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  if (!hasBrevoTransactionalPrerequisites(input.settings)) {
    throw new Error("Brevo transactional email is not configured.");
  }

  const recipients = parseBrevoRecipientEmails(input.to);

  if (recipients.length === 0) {
    throw new Error("Add at least one valid recipient email.");
  }

  const replyToEmail = input.replyTo?.trim();

  const response = await brevoRequest<{ messageId?: string }>(input.settings, "/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: input.settings.senderName || siteConfig.name,
        email: input.settings.senderEmail
      },
      to: recipients.map((email) => ({ email })),
      replyTo: replyToEmail ? { email: replyToEmail } : undefined,
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text
    })
  });

  return {
    accepted: recipients,
    messageId: response?.messageId ?? null
  };
}

type RawBrevoList = {
  id: number;
  name: string;
  totalSubscribers?: number;
  folderName?: string | null;
};

export type BrevoSenderRecord = {
  id: number;
  name: string;
  email: string;
  active: boolean;
};

type RawBrevoSender = {
  id?: number;
  name?: string;
  email?: string;
  active?: boolean;
};

type RawBrevoCampaignGlobalStats = {
  sent?: number;
  delivered?: number;
  uniqueViews?: number;
  uniqueClicks?: number;
  unsubscriptions?: number;
  hardBounces?: number;
  softBounces?: number;
  complaints?: number;
  opensRate?: number;
  clickers?: number;
  clicksRate?: number;
};

type RawBrevoCampaign = {
  id?: number;
  status?: string;
  name?: string;
  subject?: string;
  sender?: {
    email?: string;
  } | null;
  createdAt?: string;
  sentDate?: string;
  statistics?: {
    globalStats?: RawBrevoCampaignGlobalStats | null;
  } | null;
};

type RawBrevoContact = {
  id?: number;
  email?: string;
  emailBlacklisted?: boolean;
  attributes?: Record<string, unknown> | null;
};

export async function fetchBrevoLists(settings: BrevoSettings) {
  if (!settings.enabled || !settings.apiKeyConfigured) {
    return {
      lists: [] as BrevoListRecord[],
      error: null as string | null
    };
  }

  try {
    const pageSize = 50;
    let offset = 0;
    let totalCount = Number.POSITIVE_INFINITY;
    const lists: BrevoListRecord[] = [];

    while (offset < totalCount) {
      const response = await brevoRequest<{ count?: number; lists?: RawBrevoList[] }>(
        settings,
        `/contacts/lists?limit=${pageSize}&offset=${offset}`,
        {
          method: "GET"
        }
      );

      const pageItems = (response.lists || []).map((list) => ({
        id: list.id,
        name: list.name,
        totalSubscribers: list.totalSubscribers || 0,
        folderName: list.folderName || null
      }));

      lists.push(...pageItems);
      totalCount =
        typeof response.count === "number"
          ? response.count
          : offset + pageItems.length + (pageItems.length === pageSize ? 1 : 0);

      if (pageItems.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return {
      lists,
      error: null as string | null
    };
  } catch (error) {
    return {
      lists: [] as BrevoListRecord[],
      error: error instanceof Error ? error.message : "Unable to load Brevo lists."
    };
  }
}

export async function fetchBrevoSenders(settings: BrevoSettings) {
  if (!settings.enabled || !settings.apiKeyConfigured) {
    return {
      senders: [] as BrevoSenderRecord[],
      error: null as string | null
    };
  }

  try {
    const response = await brevoRequest<{ senders?: RawBrevoSender[] }>(settings, "/senders", {
      method: "GET"
    });

    return {
      senders: (response.senders || [])
        .map((sender) => {
          const email = (sender.email || "").trim().toLowerCase();

          if (!email || typeof sender.id !== "number") {
            return null;
          }

          return {
            id: sender.id,
            name: (sender.name || "").trim() || email,
            email,
            active: Boolean(sender.active)
          };
        })
        .filter((sender): sender is BrevoSenderRecord => Boolean(sender)),
      error: null as string | null
    };
  } catch (error) {
    return {
      senders: [] as BrevoSenderRecord[],
      error: error instanceof Error ? error.message : "Unable to load Brevo senders."
    };
  }
}

function toOptionalDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapBrevoCampaignReport(campaign: RawBrevoCampaign): BrevoCampaignReportRecord | null {
  if (typeof campaign.id !== "number") {
    return null;
  }

  const stats = campaign.statistics?.globalStats || null;
  const delivered = stats?.delivered ?? 0;
  const uniqueClicks = stats?.uniqueClicks ?? 0;

  return {
    id: campaign.id,
    status: campaign.status ?? null,
    name: (campaign.name || "").trim() || `Brevo campaign ${campaign.id}`,
    subject: campaign.subject ?? null,
    senderEmail: campaign.sender?.email?.trim().toLowerCase() || null,
    createdAt: toOptionalDate(campaign.createdAt),
    sentDate: toOptionalDate(campaign.sentDate),
    stats: stats
      ? {
          sent: stats.sent ?? 0,
          delivered,
          uniqueViews: stats.uniqueViews ?? 0,
          uniqueClicks,
          unsubscriptions: stats.unsubscriptions ?? 0,
          hardBounces: stats.hardBounces ?? 0,
          softBounces: stats.softBounces ?? 0,
          complaints: stats.complaints ?? 0,
          opensRate:
            typeof stats.opensRate === "number"
              ? stats.opensRate
              : delivered > 0
                ? (stats.uniqueViews ?? 0) / delivered
                : null,
          clickRate:
            typeof stats.clicksRate === "number"
              ? stats.clicksRate
              : delivered > 0
                ? uniqueClicks / delivered
                : null
        }
      : null
  };
}

export async function fetchBrevoCampaignReports(settings: BrevoSettings) {
  if (!settings.enabled || !settings.apiKeyConfigured) {
    return {
      reports: [] as BrevoCampaignReportRecord[],
      error: null as string | null
    };
  }

  try {
    const pageSize = 100;
    let offset = 0;
    let totalCount = Number.POSITIVE_INFINITY;
    const reports: BrevoCampaignReportRecord[] = [];

    while (offset < totalCount) {
      const response = await brevoRequest<{ count?: number; campaigns?: RawBrevoCampaign[] }>(
        settings,
        `/emailCampaigns?limit=${pageSize}&offset=${offset}&sort=desc&statistics=globalStats&excludeHtmlContent=true`,
        {
          method: "GET"
        }
      );

      const pageItems = (response.campaigns || [])
        .map(mapBrevoCampaignReport)
        .filter((campaign): campaign is BrevoCampaignReportRecord => Boolean(campaign));

      reports.push(...pageItems);
      totalCount =
        typeof response.count === "number"
          ? response.count
          : offset + pageItems.length + (pageItems.length === pageSize ? 1 : 0);

      if (pageItems.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return {
      reports,
      error: null as string | null
    };
  } catch (error) {
    return {
      reports: [] as BrevoCampaignReportRecord[],
      error: error instanceof Error ? error.message : "Unable to load Brevo campaign reports."
    };
  }
}

export async function fetchBrevoCampaignReportById(input: {
  settings: BrevoSettings;
  brevoCampaignId: number;
}) {
  if (!input.settings.enabled || !input.settings.apiKeyConfigured) {
    return {
      report: null as BrevoCampaignReportRecord | null,
      error: null as string | null
    };
  }

  try {
    const response = await brevoRequest<RawBrevoCampaign>(
      input.settings,
      `/emailCampaigns/${input.brevoCampaignId}?statistics=globalStats&excludeHtmlContent=true`,
      {
        method: "GET"
      }
    );

    return {
      report: mapBrevoCampaignReport(response),
      error: null as string | null
    };
  } catch (error) {
    return {
      report: null as BrevoCampaignReportRecord | null,
      error: error instanceof Error ? error.message : "Unable to load Brevo campaign report."
    };
  }
}

export async function fetchBrevoContactsFromList(input: {
  settings: BrevoSettings;
  listId: number;
}) {
  const contacts: Array<{
    brevoContactId: number | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    emailBlacklisted: boolean;
    metadata: string | null;
  }> = [];
  const pageSize = 50;
  let offset = 0;
  let totalCount = Number.POSITIVE_INFINITY;

  while (offset < totalCount) {
    const response = await brevoRequest<{ count?: number; contacts?: RawBrevoContact[] }>(
      input.settings,
      `/contacts/lists/${input.listId}/contacts?limit=${pageSize}&offset=${offset}`,
      {
        method: "GET"
      }
    );

    const pageItems = (response.contacts || [])
      .map((contact) => {
        const email = (contact.email || "").trim().toLowerCase();
        const attributes =
          contact.attributes && typeof contact.attributes === "object" ? contact.attributes : {};
        const firstNameValue =
          attributes.FIRSTNAME ??
          attributes.FIRST_NAME ??
          attributes.firstName ??
          attributes.first_name;
        const lastNameValue =
          attributes.LASTNAME ??
          attributes.LAST_NAME ??
          attributes.lastName ??
          attributes.last_name;

        if (!email) {
          return null;
        }

        return {
          brevoContactId: typeof contact.id === "number" ? contact.id : null,
          email,
          firstName: typeof firstNameValue === "string" && firstNameValue.trim() ? firstNameValue.trim() : null,
          lastName: typeof lastNameValue === "string" && lastNameValue.trim() ? lastNameValue.trim() : null,
          emailBlacklisted: Boolean(contact.emailBlacklisted),
          metadata: Object.keys(attributes).length > 0 ? JSON.stringify(attributes) : null
        };
      })
      .filter(
        (
          item
        ): item is {
          brevoContactId: number | null;
          email: string;
          firstName: string | null;
          lastName: string | null;
          emailBlacklisted: boolean;
          metadata: string | null;
        } => Boolean(item)
      );

    contacts.push(...pageItems);
    totalCount =
      typeof response.count === "number"
        ? response.count
        : offset + pageItems.length + (pageItems.length === pageSize ? 1 : 0);

    if (pageItems.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return contacts;
}

export async function upsertBrevoContact(input: {
  settings: BrevoSettings;
  email: string;
  listIds: number[];
}) {
  const email = input.email.trim().toLowerCase();
  const listIds = Array.from(new Set(input.listIds.filter((value) => Number.isFinite(value) && value > 0)));

  if (!email || !input.settings.enabled || !input.settings.apiKeyConfigured || listIds.length === 0) {
    return {
      synced: false,
      skipped: true
    };
  }

  await brevoRequest(input.settings, "/contacts", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      listIds,
      updateEnabled: true
    })
  });

  return {
    synced: true,
    skipped: false
  };
}

export async function syncBrevoAudienceEmails(input: {
  settings: BrevoSettings;
  emails: string[];
  listIds: number[];
}) {
  const uniqueEmails = Array.from(
    new Set(
      input.emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (!input.settings.enabled || !input.settings.apiKeyConfigured) {
    return {
      total: uniqueEmails.length,
      synced: 0,
      skipped: uniqueEmails.length,
      failed: 0
    };
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const email of uniqueEmails) {
    try {
      const result = await upsertBrevoContact({
        settings: input.settings,
        email,
        listIds: input.listIds
      });

      if (result.skipped) {
        skipped += 1;
      } else {
        synced += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    total: uniqueEmails.length,
    synced,
    skipped,
    failed
  };
}

export async function removeBrevoContactFromLists(input: {
  settings: BrevoSettings;
  email: string;
  listIds: number[];
}) {
  const email = input.email.trim().toLowerCase();
  const listIds = Array.from(new Set(input.listIds.filter((value) => Number.isFinite(value) && value > 0)));

  if (!email || !input.settings.enabled || !input.settings.apiKeyConfigured || listIds.length === 0) {
    return {
      removed: false,
      skipped: true
    };
  }

  for (const listId of listIds) {
    await brevoRequest(input.settings, `/contacts/lists/${listId}/contacts/remove`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        emails: [email]
      })
    });
  }

  return {
    removed: true,
    skipped: false
  };
}

function buildCampaignSender(
  campaign: Pick<EmailCampaignRecord, "senderName" | "senderEmail" | "replyTo">,
  settings: BrevoSettings
) {
  const name = (campaign.senderName || settings.senderName || siteConfig.name).trim();
  const email = (campaign.senderEmail || settings.senderEmail).trim();

  if (!email) {
    throw new Error("Add a Brevo sender email before syncing campaigns.");
  }

  return {
    sender: {
      name,
      email
    },
    replyTo: (campaign.replyTo || settings.replyTo || "").trim() || undefined
  };
}

function buildBrevoCampaignPayload(
  campaign: EmailCampaignRecord,
  settings: BrevoSettings,
  includeType: boolean
) {
  const listIds = resolveAudienceListIds(campaign.audienceType, settings, campaign.customListIds);

  if (listIds.length === 0) {
    throw new Error("No Brevo list is configured for this campaign audience.");
  }

  const senderConfig = buildCampaignSender(campaign, settings);

  return {
    ...(includeType ? { type: "classic" } : {}),
    name: campaign.name,
    subject: campaign.subject,
    previewText: campaign.previewText || undefined,
    htmlContent: campaign.contentHtml,
    recipients: {
      listIds
    },
    scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : undefined,
    ...senderConfig
  };
}

export async function pushCampaignToBrevo(input: {
  settings: BrevoSettings;
  campaign: EmailCampaignRecord;
}) {
  const payload = buildBrevoCampaignPayload(input.campaign, input.settings, !input.campaign.brevoCampaignId);
  const senderEmail = payload.sender.email.trim().toLowerCase();
  const senderSnapshot = await fetchBrevoSenders(input.settings);

  if (!senderSnapshot.error && senderSnapshot.senders.length > 0) {
    const activeSenders = senderSnapshot.senders.filter((sender) => sender.active);
    const senderIsActive = activeSenders.some((sender) => sender.email === senderEmail);

    if (!senderIsActive) {
      const activeSenderEmails = activeSenders.map((sender) => sender.email);
      const senderListMessage =
        activeSenderEmails.length > 0
          ? `Active Brevo campaign senders in this account: ${activeSenderEmails.join(", ")}.`
          : "No active Brevo campaign senders were returned by the account.";

      throw new Error(`Sender ${senderEmail} is not active in Brevo campaigns. ${senderListMessage}`);
    }
  }

  if (input.campaign.brevoCampaignId) {
    await brevoRequest(
      input.settings,
      `/emailCampaigns/${input.campaign.brevoCampaignId}`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    return {
      brevoCampaignId: input.campaign.brevoCampaignId
    };
  }

  const response = await brevoRequest<{ id?: number }>(input.settings, "/emailCampaigns", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response?.id) {
    throw new Error("Brevo did not return a campaign ID.");
  }

  return {
    brevoCampaignId: response.id
  };
}

export async function sendBrevoCampaignTest(input: {
  settings: BrevoSettings;
  brevoCampaignId: number;
  email: string;
}) {
  await brevoRequest(input.settings, `/emailCampaigns/${input.brevoCampaignId}/sendTest`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      emailTo: [input.email.trim().toLowerCase()]
    })
  });
}

export async function sendBrevoCampaignNow(input: {
  settings: BrevoSettings;
  brevoCampaignId: number;
}) {
  await brevoRequest(input.settings, `/emailCampaigns/${input.brevoCampaignId}/sendNow`, {
    method: "POST"
  });
}
