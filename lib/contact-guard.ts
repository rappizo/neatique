import { prisma } from "@/lib/db";

const CONTACT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const CONTACT_LOOKBACK_MINUTES = 30;
const CONTACT_MIN_SUBMIT_AGE_MS = 2500;

export type NormalizedContactSubmission = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
  startedAt: number | null;
};

export type ContactSpamAssessment = {
  blocked: boolean;
  reasons: string[];
  score: number;
  sameEmailRecentCount: number;
  sameIpRecentCount: number;
  duplicateRecentCount: number;
  submitAgeMs: number | null;
};

function normalizeSingleLine(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMultiline(value: string, maxLength: number) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function countUrlSignals(value: string) {
  const matches = value.match(/https?:\/\/|www\./gi);
  return matches ? matches.length : 0;
}

function isRandomLookingToken(value: string) {
  const lettersOnly = value.replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length < 16) {
    return false;
  }

  const vowelCount = (lettersOnly.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowelCount / lettersOnly.length;
  const hasMixedCase = /[A-Z]/.test(lettersOnly) && /[a-z]/.test(lettersOnly);
  const hasSpaces = /\s/.test(value);

  return (!hasSpaces && hasMixedCase && vowelRatio < 0.28) || /^[A-Za-z0-9]{22,}$/.test(value.trim());
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
      subject?: string | null;
      message?: string | null;
    };

    return {
      ipAddress: parsed.meta?.ipAddress?.trim() || null,
      subject: typeof parsed.subject === "string" ? parsed.subject : "",
      message: typeof parsed.message === "string" ? parsed.message : ""
    };
  } catch {
    return null;
  }
}

export function getClientIpFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    const ip = first?.trim();
    if (ip) {
      return ip;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return null;
}

export function getUserAgentFromHeaders(headers: Headers) {
  return headers.get("user-agent")?.trim().slice(0, 500) || null;
}

export function normalizeContactSubmissionInput(formData: FormData): NormalizedContactSubmission {
  const startedAtRaw = String(formData.get("startedAt") || "").trim();

  return {
    name: normalizeSingleLine(String(formData.get("name") || ""), 80),
    email: normalizeSingleLine(String(formData.get("email") || ""), 160).toLowerCase(),
    subject: normalizeSingleLine(String(formData.get("subject") || ""), 140),
    message: normalizeMultiline(String(formData.get("message") || ""), 2500),
    website: normalizeSingleLine(String(formData.get("website") || ""), 200),
    startedAt: /^\d{10,}$/.test(startedAtRaw) ? Number.parseInt(startedAtRaw, 10) : null
  };
}

export function validateContactSubmissionInput(input: NormalizedContactSubmission) {
  if (!input.name || input.name.length < 2) {
    return "Please provide your name.";
  }

  if (!CONTACT_EMAIL_REGEX.test(input.email)) {
    return "Please provide a valid email address.";
  }

  if (!input.subject || input.subject.length < 3) {
    return "Please add a short subject.";
  }

  if (!input.message || input.message.length < 10) {
    return "Please include a little more detail in your message.";
  }

  return null;
}

export async function assessContactSubmissionRisk(input: {
  submission: NormalizedContactSubmission;
  ipAddress: string | null;
}) {
  const reasons: string[] = [];
  let score = 0;

  if (input.submission.website) {
    reasons.push("honeypot-filled");
    score += 100;
  }

  const now = Date.now();
  const submitAgeMs =
    input.submission.startedAt && input.submission.startedAt > 0
      ? Math.max(0, now - input.submission.startedAt)
      : null;

  if (submitAgeMs !== null && submitAgeMs < CONTACT_MIN_SUBMIT_AGE_MS) {
    reasons.push("submitted-too-fast");
    score += 45;
  }

  if (isRandomLookingToken(input.submission.subject)) {
    reasons.push("random-subject");
    score += 35;
  }

  if (isRandomLookingToken(input.submission.message)) {
    reasons.push("random-message");
    score += 45;
  }

  if (
    input.submission.message.length < 24 &&
    input.submission.subject.length >= 16 &&
    isRandomLookingToken(`${input.submission.subject}${input.submission.message}`)
  ) {
    reasons.push("short-random-content");
    score += 20;
  }

  if (countUrlSignals(`${input.submission.subject}\n${input.submission.message}`) > 1) {
    reasons.push("multiple-links");
    score += 20;
  }

  const recentThreshold = new Date(now - CONTACT_LOOKBACK_MINUTES * 60 * 1000);
  const recentSubmissions = await prisma.formSubmission.findMany({
    where: {
      formKey: "contact",
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

  const duplicateRecentCount = recentSubmissions.filter((submission) => {
    const meta = getPayloadMeta(submission.payload);
    if (!meta) {
      return false;
    }

    return (
      meta.subject.trim().toLowerCase() === input.submission.subject.trim().toLowerCase() &&
      meta.message.trim().toLowerCase() === input.submission.message.trim().toLowerCase()
    );
  }).length;

  if (sameEmailRecentCount >= 2) {
    reasons.push("recent-email-repeat");
    score += 30;
  }

  if (sameIpRecentCount >= 4) {
    reasons.push("recent-ip-rate-limit");
    score += 40;
  }

  if (duplicateRecentCount >= 1) {
    reasons.push("duplicate-content");
    score += 50;
  }

  return {
    blocked: score >= 60,
    reasons,
    score,
    sameEmailRecentCount,
    sameIpRecentCount,
    duplicateRecentCount,
    submitAgeMs
  } satisfies ContactSpamAssessment;
}
