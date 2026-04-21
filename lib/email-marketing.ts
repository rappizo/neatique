import { prisma } from "@/lib/db";
import { getBrevoSettings, resolveAudienceListIds, upsertBrevoContact } from "@/lib/brevo";
import type { EmailAudienceType, StoreSettingsRecord } from "@/lib/types";

async function loadStoreSettingsMap() {
  const settings = await prisma.storeSetting.findMany({
    orderBy: {
      key: "asc"
    }
  });

  return settings.reduce<StoreSettingsRecord>((accumulator, setting) => {
    accumulator[setting.key] = setting.value;
    return accumulator;
  }, {});
}

function shouldAutoSyncAudience(audienceType: EmailAudienceType, settings: ReturnType<typeof getBrevoSettings>) {
  if (!settings.enabled || !settings.apiKeyConfigured) {
    return false;
  }

  switch (audienceType) {
    case "NEWSLETTER":
      return settings.syncSubscribe;
    case "CUSTOMERS":
      return settings.syncCustomers;
    case "LEADS":
      return settings.syncContact;
    case "ALL_MARKETING":
      return settings.syncSubscribe || settings.syncCustomers || settings.syncContact;
    case "CUSTOM":
      return true;
    default:
      return false;
  }
}

function resolveForcedFallbackListIds(
  audienceType: EmailAudienceType,
  settings: ReturnType<typeof getBrevoSettings>
) {
  const configuredListIds = Array.from(
    new Set(
      [settings.contactListId, settings.customersListId, settings.subscribersListId].filter(
        (value): value is number => typeof value === "number"
      )
    )
  );

  if (configuredListIds.length === 0) {
    return [];
  }

  switch (audienceType) {
    case "LEADS":
      return [settings.contactListId, settings.customersListId, settings.subscribersListId].filter(
        (value): value is number => typeof value === "number"
      );
    case "CUSTOMERS":
      return [settings.customersListId, settings.subscribersListId, settings.contactListId].filter(
        (value): value is number => typeof value === "number"
      );
    case "NEWSLETTER":
      return [settings.subscribersListId, settings.customersListId, settings.contactListId].filter(
        (value): value is number => typeof value === "number"
      );
    case "ALL_MARKETING":
    case "CUSTOM":
    default:
      return configuredListIds;
  }
}

export async function syncEmailMarketingContact(input: {
  email: string;
  audienceType: EmailAudienceType;
  customListIds?: string | null;
  force?: boolean;
}) {
  const settingsMap = await loadStoreSettingsMap();
  const brevoSettings = getBrevoSettings(settingsMap);

  if (!(input.force && brevoSettings.apiKeyConfigured) && !shouldAutoSyncAudience(input.audienceType, brevoSettings)) {
    return {
      synced: false,
      skipped: true
    };
  }

  const listIds = resolveAudienceListIds(input.audienceType, brevoSettings, input.customListIds);
  const fallbackListIds = input.force ? resolveForcedFallbackListIds(input.audienceType, brevoSettings) : [];
  const targetListIds = listIds.length > 0 ? listIds : fallbackListIds;

  if (targetListIds.length === 0) {
    return {
      synced: false,
      skipped: true
    };
  }

  if (input.force && listIds.length === 0 && fallbackListIds.length > 0) {
    console.warn("Brevo audience-specific list missing. Using fallback list ids instead.", {
      audienceType: input.audienceType,
      fallbackListIds
    });
  }

  return upsertBrevoContact({
    settings: brevoSettings,
    email: input.email,
    listIds: targetListIds
  });
}
