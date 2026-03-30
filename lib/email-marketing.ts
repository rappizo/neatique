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

export async function syncEmailMarketingContact(input: {
  email: string;
  audienceType: EmailAudienceType;
  customListIds?: string | null;
}) {
  const settingsMap = await loadStoreSettingsMap();
  const brevoSettings = getBrevoSettings(settingsMap);

  if (!shouldAutoSyncAudience(input.audienceType, brevoSettings)) {
    return {
      synced: false,
      skipped: true
    };
  }

  const listIds = resolveAudienceListIds(input.audienceType, brevoSettings, input.customListIds);

  if (listIds.length === 0) {
    return {
      synced: false,
      skipped: true
    };
  }

  return upsertBrevoContact({
    settings: brevoSettings,
    email: input.email,
    listIds
  });
}
