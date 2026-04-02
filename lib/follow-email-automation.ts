import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getEnabledAtKey,
  getFollowEmailDueAt,
  getFollowEmailOverview,
  getOmbFollowStage,
  getRyoFollowStage,
  renderFollowEmailTemplate,
  toFollowEmailHtml
} from "@/lib/follow-emails";
import { sendConfiguredEmail } from "@/lib/email";
import type { FollowEmailStageKey } from "@/lib/types";

type AutomationCounters = {
  sent: number;
  skipped: number;
  failed: number;
};

type FollowEmailAutomationSummary = {
  ok: boolean;
  omb: AutomationCounters;
  ryo: AutomationCounters;
};

function emptyCounters(): AutomationCounters {
  return {
    sent: 0,
    skipped: 0,
    failed: 0
  };
}

async function loadSettingsMap() {
  const settings = await prisma.storeSetting.findMany({
    orderBy: {
      key: "asc"
    }
  });

  return settings.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.key] = item.value;
    return accumulator;
  }, {});
}

async function createFollowEmailLog(input: {
  processKey: "OMB" | "RYO";
  stageKey: FollowEmailStageKey;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  bodyText: string;
  ombClaimId?: string;
  ryoClaimId?: string;
}) {
  try {
    await prisma.followEmailLog.create({
      data: {
        processKey: input.processKey,
        stageKey: input.stageKey,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName ?? null,
        subject: input.subject,
        bodyText: input.bodyText,
        ombClaimId: input.ombClaimId,
        ryoClaimId: input.ryoClaimId
      }
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }

    throw error;
  }
}

export async function runFollowEmailAutomation(): Promise<FollowEmailAutomationSummary> {
  const settings = await loadSettingsMap();
  const ombOverview = getFollowEmailOverview("OMB", settings);
  const ryoOverview = getFollowEmailOverview("RYO", settings);
  const now = new Date();
  const ombEnabledAt = settings[getEnabledAtKey("OMB")] ? new Date(settings[getEnabledAtKey("OMB")]) : null;
  const ryoEnabledAt = settings[getEnabledAtKey("RYO")] ? new Date(settings[getEnabledAtKey("RYO")]) : null;
  const summary: FollowEmailAutomationSummary = {
    ok: true,
    omb: emptyCounters(),
    ryo: emptyCounters()
  };

  const [ombClaims, ryoClaims] = await Promise.all([
    ombOverview.enabled
      ? prisma.ombClaim.findMany({
          include: {
            followEmails: {
              orderBy: [{ createdAt: "desc" }]
            }
          },
          orderBy: [{ createdAt: "asc" }]
        })
      : Promise.resolve([]),
    ryoOverview.enabled
      ? prisma.ryoClaim.findMany({
          include: {
            followEmails: {
              orderBy: [{ createdAt: "desc" }]
            }
          },
          orderBy: [{ createdAt: "asc" }]
        })
      : Promise.resolve([])
  ]);

  for (const claim of ombClaims) {
    const stageKey = getOmbFollowStage(claim);
    const template = ombOverview.templates.find((item) => item.stageKey === stageKey);

    if (!template || !claim.email) {
      summary.omb.skipped += 1;
      continue;
    }

    if (claim.followEmails.some((log) => log.stageKey === stageKey)) {
      summary.omb.skipped += 1;
      continue;
    }

    const dueAt = getFollowEmailDueAt(stageKey, claim, ombOverview.delayMinutes);
    if (ombEnabledAt && dueAt.getTime() < ombEnabledAt.getTime()) {
      summary.omb.skipped += 1;
      continue;
    }

    if (dueAt.getTime() > now.getTime()) {
      summary.omb.skipped += 1;
      continue;
    }

    const subject = renderFollowEmailTemplate(template.subject, {
      customerName: claim.name,
      customerEmail: claim.email
    });
    const bodyText = renderFollowEmailTemplate(template.bodyText, {
      customerName: claim.name,
      customerEmail: claim.email
    });

    try {
      const result = await sendConfiguredEmail({
        to: claim.email,
        subject,
        text: bodyText,
        html: toFollowEmailHtml(bodyText)
      });

      if (!result.delivered) {
        summary.ok = false;
        summary.omb.failed += 1;
        continue;
      }

      const created = await createFollowEmailLog({
        processKey: "OMB",
        stageKey,
        recipientEmail: claim.email,
        recipientName: claim.name,
        subject,
        bodyText,
        ombClaimId: claim.id
      });

      if (created) {
        summary.omb.sent += 1;
      } else {
        summary.omb.skipped += 1;
      }
    } catch (error) {
      console.error("OMB follow email automation failed:", error);
      summary.ok = false;
      summary.omb.failed += 1;
    }
  }

  for (const claim of ryoClaims) {
    const stageKey = getRyoFollowStage(claim);
    const template = ryoOverview.templates.find((item) => item.stageKey === stageKey);

    if (!template || !claim.email) {
      summary.ryo.skipped += 1;
      continue;
    }

    if (claim.followEmails.some((log) => log.stageKey === stageKey)) {
      summary.ryo.skipped += 1;
      continue;
    }

    const dueAt = getFollowEmailDueAt(stageKey, claim, ryoOverview.delayMinutes);
    if (ryoEnabledAt && dueAt.getTime() < ryoEnabledAt.getTime()) {
      summary.ryo.skipped += 1;
      continue;
    }

    if (dueAt.getTime() > now.getTime()) {
      summary.ryo.skipped += 1;
      continue;
    }

    const subject = renderFollowEmailTemplate(template.subject, {
      customerName: claim.name,
      customerEmail: claim.email
    });
    const bodyText = renderFollowEmailTemplate(template.bodyText, {
      customerName: claim.name,
      customerEmail: claim.email
    });

    try {
      const result = await sendConfiguredEmail({
        to: claim.email,
        subject,
        text: bodyText,
        html: toFollowEmailHtml(bodyText)
      });

      if (!result.delivered) {
        summary.ok = false;
        summary.ryo.failed += 1;
        continue;
      }

      const created = await createFollowEmailLog({
        processKey: "RYO",
        stageKey,
        recipientEmail: claim.email,
        recipientName: claim.name,
        subject,
        bodyText,
        ryoClaimId: claim.id
      });

      if (created) {
        summary.ryo.sent += 1;
      } else {
        summary.ryo.skipped += 1;
      }
    } catch (error) {
      console.error("RYO follow email automation failed:", error);
      summary.ok = false;
      summary.ryo.failed += 1;
    }
  }

  return summary;
}
