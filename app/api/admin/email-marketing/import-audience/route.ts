import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { fetchBrevoLists, getBrevoSettings, resolveAudienceListIds } from "@/lib/brevo";
import { importAudienceContactsFromBrevo } from "@/lib/email-marketing-audience";
import { prisma } from "@/lib/db";
import type { EmailAudienceType } from "@/lib/types";

function parseEmailAudienceType(value: string | undefined): EmailAudienceType {
  switch (value) {
    case "CUSTOMERS":
      return "CUSTOMERS";
    case "LEADS":
      return "LEADS";
    case "ALL_MARKETING":
      return "ALL_MARKETING";
    case "CUSTOM":
      return "CUSTOM";
    default:
      return "NEWSLETTER";
  }
}

async function loadStoreSettingsMap() {
  const settings = await prisma.storeSetting.findMany({
    orderBy: {
      key: "asc"
    }
  });

  return settings.reduce<Record<string, string>>((accumulator, setting) => {
    accumulator[setting.key] = setting.value;
    return accumulator;
  }, {});
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      audienceType?: string;
      customListIds?: string | null;
    };

    const audienceType = parseEmailAudienceType(body.audienceType);
    const settingsMap = await loadStoreSettingsMap();
    const brevoSettings = getBrevoSettings(settingsMap);

    if (!brevoSettings.enabled || !brevoSettings.apiKeyConfigured) {
      return NextResponse.json({ error: "Brevo is not configured." }, { status: 400 });
    }

    const targetListIds = resolveAudienceListIds(audienceType, brevoSettings, body.customListIds || null);

    if (targetListIds.length === 0) {
      return NextResponse.json({ error: "No Brevo list is configured for this audience." }, { status: 400 });
    }

    const listLookup = new Map<number, string>();
    const knownLists = await fetchBrevoLists(brevoSettings);
    for (const list of knownLists.lists) {
      listLookup.set(list.id, list.name);
    }

    const result = await importAudienceContactsFromBrevo({
      audienceType,
      listIds: targetListIds,
      listNameById: listLookup,
      settings: brevoSettings
    });

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/audience/${audienceType}`);

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      uniqueImported: result.uniqueImported,
      failed: result.failed
    });
  } catch (error) {
    console.error("Brevo audience import failed:", error);
    return NextResponse.json({ error: "Brevo import failed." }, { status: 500 });
  }
}
