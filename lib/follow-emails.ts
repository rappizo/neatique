import type {
  FollowEmailOverviewRecord,
  FollowEmailProcessKey,
  FollowEmailStageKey
} from "@/lib/types";

type FollowEmailSettingsMap = Record<string, string>;

type FollowEmailStageDateSource = {
  createdAt: Date;
  reviewStepSubmittedAt?: Date | null;
  completedAt?: Date | null;
};

type FollowEmailClaimProgress = {
  createdAt: Date;
  reviewStepSubmittedAt?: Date | null;
  completedAt?: Date | null;
  reviewRating?: number | null;
};

type FollowEmailTemplateInput = {
  customerName?: string | null;
  customerEmail?: string | null;
};

export const FOLLOW_EMAIL_STAGE_ORDER: FollowEmailStageKey[] = [
  "WAITING_STEP_2",
  "WAITING_LAST_STEP",
  "COMPLETED"
];

export const FOLLOW_EMAIL_STAGE_LABELS: Record<FollowEmailStageKey, string> = {
  WAITING_STEP_2: "Waiting for Step 2",
  WAITING_LAST_STEP: "Waiting for Last Step",
  COMPLETED: "Completed"
};

export const FOLLOW_EMAIL_PROCESS_LABELS: Record<FollowEmailProcessKey, string> = {
  OMB: "OMB Claim",
  RYO: "RYO registration"
};

function parseBool(value: string | undefined) {
  return value === "true" || value === "1" || value === "on";
}

function getProcessPrefix(processKey: FollowEmailProcessKey) {
  return processKey === "OMB" ? "omb" : "ryo";
}

function getTemplateKey(processKey: FollowEmailProcessKey, stageKey: FollowEmailStageKey, field: "subject" | "body") {
  return `${getProcessPrefix(processKey)}_follow_${field}_${stageKey.toLowerCase()}`;
}

function getEnabledKey(processKey: FollowEmailProcessKey) {
  return `${getProcessPrefix(processKey)}_follow_enabled`;
}

function getDelayKey(processKey: FollowEmailProcessKey) {
  return `${getProcessPrefix(processKey)}_follow_delay_minutes`;
}

export function getEnabledAtKey(processKey: FollowEmailProcessKey) {
  return `${getProcessPrefix(processKey)}_follow_enabled_at`;
}

function getDefaultTemplate(processKey: FollowEmailProcessKey, stageKey: FollowEmailStageKey) {
  if (processKey === "OMB") {
    if (stageKey === "WAITING_STEP_2") {
      return {
        subject: "We noticed your OMB process stopped after order verification",
        bodyText:
          "Hi [Customer Name],\n\nGreetings from Neatique. We noticed that you logged out during the OMB process after filling in the order information on the platform. Could you kindly let us know the reason?\n\nBest regards,\nTracy\nNeatique Team"
      };
    }

    if (stageKey === "WAITING_LAST_STEP") {
      return {
        subject: "We noticed your OMB process stopped before the last step",
        bodyText:
          "Hi [Customer Name],\n\nGreetings from Neatique. We noticed that you logged out during the OMB process after filling in the comment on the platform. Could you kindly let us know the reason?\n\nBest regards,\nTracy\nNeatique Team"
      };
    }

    return {
      subject: "We received your OMB submission",
      bodyText:
        "Hi [Customer Name],\n\nGreetings from Neatique. We received your completed OMB submission and our team will review it shortly. If anything else is needed, we will follow up by email.\n\nBest regards,\nTracy\nNeatique Team"
    };
  }

  if (stageKey === "WAITING_STEP_2") {
    return {
      subject: "We noticed your RYO registration stopped after order verification",
      bodyText:
        "Hi [Customer Name],\n\nGreetings from Neatique. We noticed that you logged out during the Register Your Order process after filling in the order information on the platform. Could you kindly let us know the reason?\n\nBest regards,\nTracy\nNeatique Team"
    };
  }

  if (stageKey === "WAITING_LAST_STEP") {
    return {
      subject: "We noticed your RYO registration stopped before the last step",
      bodyText:
        "Hi [Customer Name],\n\nGreetings from Neatique. We noticed that you logged out during the Register Your Order process after filling in the comment on the platform. Could you kindly let us know the reason?\n\nBest regards,\nTracy\nNeatique Team"
    };
  }

  return {
    subject: "We received your RYO submission",
    bodyText:
      "Hi [Customer Name],\n\nGreetings from Neatique. We received your completed Register Your Order submission and our team will review it within 24 hours. Once approved, we will email you again so you can head to /rd and redeem your mascot.\n\nBest regards,\nTracy\nNeatique Team"
  };
}

export function getFollowEmailSettingsDefaults(processKey: FollowEmailProcessKey) {
  const templates = FOLLOW_EMAIL_STAGE_ORDER.map((stageKey) => ({
    stageKey,
    ...getDefaultTemplate(processKey, stageKey)
  }));

  return {
    enabled: false,
    delayMinutes: 30,
    templates
  };
}

export function getFollowEmailOverview(
  processKey: FollowEmailProcessKey,
  settings: FollowEmailSettingsMap,
  sentCounts: Partial<Record<FollowEmailStageKey, number>> = {}
): FollowEmailOverviewRecord {
  const defaults = getFollowEmailSettingsDefaults(processKey);

  return {
    processKey,
    processLabel: FOLLOW_EMAIL_PROCESS_LABELS[processKey],
    enabled: parseBool(settings[getEnabledKey(processKey)]) || defaults.enabled,
    delayMinutes: Math.max(
      1,
      Number.parseInt(settings[getDelayKey(processKey)] || `${defaults.delayMinutes}`, 10) || defaults.delayMinutes
    ),
    totalSentToday: FOLLOW_EMAIL_STAGE_ORDER.reduce((sum, stageKey) => sum + (sentCounts[stageKey] ?? 0), 0),
    templates: FOLLOW_EMAIL_STAGE_ORDER.map((stageKey) => ({
      stageKey,
      stageLabel: FOLLOW_EMAIL_STAGE_LABELS[stageKey],
      subject: settings[getTemplateKey(processKey, stageKey, "subject")] || getDefaultTemplate(processKey, stageKey).subject,
      bodyText: settings[getTemplateKey(processKey, stageKey, "body")] || getDefaultTemplate(processKey, stageKey).bodyText,
      sentTodayCount: sentCounts[stageKey] ?? 0
    }))
  };
}

export function buildFollowEmailSettingsEntries(
  processKey: FollowEmailProcessKey,
  input: {
    enabled: boolean;
    delayMinutes: number;
    subjects: Partial<Record<FollowEmailStageKey, string>>;
    bodies: Partial<Record<FollowEmailStageKey, string>>;
  }
) {
  return [
    [getEnabledKey(processKey), input.enabled ? "true" : "false"],
    [getDelayKey(processKey), String(Math.max(1, input.delayMinutes))]
  ].concat(
    FOLLOW_EMAIL_STAGE_ORDER.flatMap((stageKey) => {
      const defaults = getDefaultTemplate(processKey, stageKey);
      return [
        [getTemplateKey(processKey, stageKey, "subject"), (input.subjects[stageKey] || defaults.subject).trim()],
        [getTemplateKey(processKey, stageKey, "body"), (input.bodies[stageKey] || defaults.bodyText).trim()]
      ];
    })
  );
}

export function renderFollowEmailTemplate(template: string, input: FollowEmailTemplateInput) {
  const customerName = (input.customerName || "there").trim() || "there";
  const customerEmail = (input.customerEmail || "").trim();

  return template
    .replaceAll("[Customer Name]", customerName)
    .replaceAll("[Cusotmer Name]", customerName)
    .replaceAll("[Customer Email]", customerEmail);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toFollowEmailHtml(bodyText: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.8;color:#2e2825">
      ${escapeHtml(bodyText).replace(/\n/g, "<br />")}
    </div>
  `;
}

export function getOmbFollowStage(claim: FollowEmailClaimProgress): FollowEmailStageKey {
  if (claim.completedAt) {
    return "COMPLETED";
  }

  if (claim.reviewRating && claim.reviewRating >= 4) {
    return "WAITING_LAST_STEP";
  }

  return "WAITING_STEP_2";
}

export function getRyoFollowStage(claim: FollowEmailClaimProgress): FollowEmailStageKey {
  if (claim.completedAt) {
    return "COMPLETED";
  }

  if (claim.reviewRating && claim.reviewRating >= 4) {
    return "WAITING_LAST_STEP";
  }

  return "WAITING_STEP_2";
}

export function getFollowEmailStageStartedAt(stageKey: FollowEmailStageKey, claim: FollowEmailStageDateSource) {
  if (stageKey === "WAITING_LAST_STEP") {
    return claim.reviewStepSubmittedAt ?? claim.createdAt;
  }

  if (stageKey === "COMPLETED") {
    return claim.completedAt ?? claim.createdAt;
  }

  return claim.createdAt;
}

export function getFollowEmailDueAt(stageKey: FollowEmailStageKey, claim: FollowEmailStageDateSource, delayMinutes: number) {
  const startedAt = getFollowEmailStageStartedAt(stageKey, claim);
  return new Date(startedAt.getTime() + Math.max(1, delayMinutes) * 60 * 1000);
}
