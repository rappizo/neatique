import { prisma } from "@/lib/db";

const SUBSCRIBE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SUBSCRIBE_LOOKBACK_MINUTES = 30;

export type NormalizedSubscribeSubmission = {
  email: string;
  company: string;
};

export type SubscribeSpamAssessment = {
  blocked: boolean;
  reasons: string[];
  score: number;
  sameEmailRecentCount: number;
  sameIpRecentCount: number;
};

function normalizeSingleLine(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getPayloadMeta(payload: string | null) {
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as {
      meta?: {
        ipAddress?: string | null;
      };
    };

    return {
      ipAddress: parsed.meta?.ipAddress?.trim() || null
    };
  } catch {
    return null;
  }
}

export function normalizeSubscribeSubmissionInput(formData: FormData): NormalizedSubscribeSubmission {
  return {
    email: normalizeSingleLine(String(formData.get("email") || ""), 160).toLowerCase(),
    company: normalizeSingleLine(String(formData.get("company") || ""), 200)
  };
}

export function validateSubscribeSubmissionInput(input: NormalizedSubscribeSubmission) {
  if (!SUBSCRIBE_EMAIL_REGEX.test(input.email)) {
    return "Please provide a valid email address.";
  }

  return null;
}

export async function assessSubscribeSubmissionRisk(input: {
  submission: NormalizedSubscribeSubmission;
  ipAddress: string | null;
}) {
  const reasons: string[] = [];
  let score = 0;

  if (input.submission.company) {
    reasons.push("honeypot-filled");
    score += 100;
  }

  const recentThreshold = new Date(Date.now() - SUBSCRIBE_LOOKBACK_MINUTES * 60 * 1000);
  const recentSubmissions = await prisma.formSubmission.findMany({
    where: {
      formKey: "subscribe",
      createdAt: {
        gte: recentThreshold
      }
    },
    select: {
      email: true,
      payload: true
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200
  });

  const sameEmailRecentCount = recentSubmissions.filter(
    (submission) => submission.email.trim().toLowerCase() === input.submission.email
  ).length;
  const sameIpRecentCount = input.ipAddress
    ? recentSubmissions.filter((submission) => getPayloadMeta(submission.payload)?.ipAddress === input.ipAddress).length
    : 0;

  if (sameEmailRecentCount >= 1) {
    reasons.push("recent-email-repeat");
    score += 55;
  }

  if (sameIpRecentCount >= 6) {
    reasons.push("recent-ip-rate-limit");
    score += 55;
  }

  return {
    blocked: score >= 55,
    reasons,
    score,
    sameEmailRecentCount,
    sameIpRecentCount
  } satisfies SubscribeSpamAssessment;
}
