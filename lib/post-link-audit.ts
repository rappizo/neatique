import { prisma } from "@/lib/db";
import type {
  PostExternalLinkAuditEntryRecord,
  PostExternalLinkAuditRecord,
  PostExternalLinkAuditResultRecord,
  PostExternalLinkRecord
} from "@/lib/types";

export const POST_EXTERNAL_LINK_AUDIT_SETTING_KEY = "post_external_link_audit";

const LINK_AUDIT_TIMEOUT_MS = 8000;
const HEAD_FALLBACK_STATUSES = new Set([400, 401, 403, 405, 406, 429, 500, 501, 502, 503, 504]);

type AuditTargetPost = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  externalLinks: PostExternalLinkRecord[];
};

function toOptionalDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeAuditResult(value: unknown): PostExternalLinkAuditResultRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const status = candidate.status;

  if (
    typeof candidate.label !== "string" ||
    typeof candidate.url !== "string" ||
    (candidate.finalUrl !== null && typeof candidate.finalUrl !== "string" && typeof candidate.finalUrl !== "undefined") ||
    (candidate.statusCode !== null &&
      typeof candidate.statusCode !== "number" &&
      typeof candidate.statusCode !== "undefined") ||
    (candidate.error !== null && typeof candidate.error !== "string" && typeof candidate.error !== "undefined") ||
    (status !== "HEALTHY" && status !== "REDIRECTED" && status !== "BROKEN")
  ) {
    return null;
  }

  return {
    label: candidate.label,
    url: candidate.url,
    finalUrl: typeof candidate.finalUrl === "string" ? candidate.finalUrl : null,
    statusCode: typeof candidate.statusCode === "number" ? candidate.statusCode : null,
    status,
    error: typeof candidate.error === "string" ? candidate.error : null
  };
}

function normalizeAuditEntry(value: unknown): PostExternalLinkAuditEntryRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.postId !== "string" ||
    typeof candidate.postTitle !== "string" ||
    typeof candidate.postSlug !== "string" ||
    typeof candidate.published !== "boolean" ||
    typeof candidate.totalLinks !== "number" ||
    typeof candidate.healthyLinks !== "number" ||
    typeof candidate.redirectedLinks !== "number" ||
    typeof candidate.brokenLinks !== "number" ||
    !Array.isArray(candidate.results)
  ) {
    return null;
  }

  return {
    postId: candidate.postId,
    postTitle: candidate.postTitle,
    postSlug: candidate.postSlug,
    published: candidate.published,
    totalLinks: candidate.totalLinks,
    healthyLinks: candidate.healthyLinks,
    redirectedLinks: candidate.redirectedLinks,
    brokenLinks: candidate.brokenLinks,
    results: candidate.results.map(normalizeAuditResult).filter(Boolean) as PostExternalLinkAuditResultRecord[]
  };
}

export function parseExternalLinksJson(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is PostExternalLinkRecord =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.label === "string" &&
        typeof item.url === "string"
    );
  } catch {
    return [];
  }
}

export function parseStoredPostExternalLinkAudit(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const checkedAt = toOptionalDate(parsed.checkedAt);

    if (
      !checkedAt ||
      typeof parsed.totalPostsChecked !== "number" ||
      typeof parsed.totalPostsWithLinks !== "number" ||
      typeof parsed.totalLinksChecked !== "number" ||
      typeof parsed.healthyLinks !== "number" ||
      typeof parsed.redirectedLinks !== "number" ||
      typeof parsed.brokenLinks !== "number" ||
      !Array.isArray(parsed.entries)
    ) {
      return null;
    }

    return {
      checkedAt,
      totalPostsChecked: parsed.totalPostsChecked,
      totalPostsWithLinks: parsed.totalPostsWithLinks,
      totalLinksChecked: parsed.totalLinksChecked,
      healthyLinks: parsed.healthyLinks,
      redirectedLinks: parsed.redirectedLinks,
      brokenLinks: parsed.brokenLinks,
      entries: parsed.entries.map(normalizeAuditEntry).filter(Boolean) as PostExternalLinkAuditEntryRecord[]
    } satisfies PostExternalLinkAuditRecord;
  } catch {
    return null;
  }
}

export async function getStoredPostExternalLinkAudit() {
  const setting = await prisma.storeSetting.findUnique({
    where: {
      key: POST_EXTERNAL_LINK_AUDIT_SETTING_KEY
    }
  });

  return parseStoredPostExternalLinkAudit(setting?.value);
}

export async function savePostExternalLinkAudit(report: PostExternalLinkAuditRecord) {
  await prisma.storeSetting.upsert({
    where: {
      key: POST_EXTERNAL_LINK_AUDIT_SETTING_KEY
    },
    update: {
      value: JSON.stringify({
        checkedAt: report.checkedAt.toISOString(),
        totalPostsChecked: report.totalPostsChecked,
        totalPostsWithLinks: report.totalPostsWithLinks,
        totalLinksChecked: report.totalLinksChecked,
        healthyLinks: report.healthyLinks,
        redirectedLinks: report.redirectedLinks,
        brokenLinks: report.brokenLinks,
        entries: report.entries
      })
    },
    create: {
      key: POST_EXTERNAL_LINK_AUDIT_SETTING_KEY,
      value: JSON.stringify({
        checkedAt: report.checkedAt.toISOString(),
        totalPostsChecked: report.totalPostsChecked,
        totalPostsWithLinks: report.totalPostsWithLinks,
        totalLinksChecked: report.totalLinksChecked,
        healthyLinks: report.healthyLinks,
        redirectedLinks: report.redirectedLinks,
        brokenLinks: report.brokenLinks,
        entries: report.entries
      })
    }
  });
}

async function probeExternalUrl(url: string, method: "HEAD" | "GET") {
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(LINK_AUDIT_TIMEOUT_MS),
      headers: {
        "user-agent": "NeatiqueLinkValidator/1.0"
      }
    });

    return {
      ok: response.ok,
      statusCode: response.status,
      finalUrl: response.url || url,
      redirected: response.redirected || (response.url && response.url !== url),
      error: null,
      shouldRetryWithGet: method === "HEAD" && HEAD_FALLBACK_STATUSES.has(response.status)
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      finalUrl: null,
      redirected: false,
      error: error instanceof Error ? error.message : "Request failed.",
      shouldRetryWithGet: method === "HEAD"
    };
  }
}

export async function validateExternalLink(link: PostExternalLinkRecord): Promise<PostExternalLinkAuditResultRecord> {
  const trimmedUrl = link.url.trim();

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        label: link.label,
        url: trimmedUrl,
        finalUrl: null,
        statusCode: null,
        status: "BROKEN",
        error: "Only http/https URLs can be validated."
      };
    }
  } catch {
    return {
      label: link.label,
      url: trimmedUrl,
      finalUrl: null,
      statusCode: null,
      status: "BROKEN",
      error: "Invalid URL format."
    };
  }

  let probe = await probeExternalUrl(trimmedUrl, "HEAD");

  if (probe.shouldRetryWithGet) {
    probe = await probeExternalUrl(trimmedUrl, "GET");
  }

  if (!probe.ok) {
    return {
      label: link.label,
      url: trimmedUrl,
      finalUrl: probe.finalUrl,
      statusCode: probe.statusCode,
      status: "BROKEN",
      error: probe.error || (probe.statusCode ? `HTTP ${probe.statusCode}` : "Unable to load URL.")
    };
  }

  return {
    label: link.label,
    url: trimmedUrl,
    finalUrl: probe.finalUrl,
    statusCode: probe.statusCode,
    status: probe.redirected ? "REDIRECTED" : "HEALTHY",
    error: null
  };
}

export async function runPostExternalLinkAudit(posts: AuditTargetPost[]): Promise<PostExternalLinkAuditRecord> {
  const entries = await Promise.all(
    posts
      .filter((post) => post.externalLinks.length > 0)
      .map(async (post) => {
        const results = await Promise.all(post.externalLinks.map((link) => validateExternalLink(link)));
        const healthyLinks = results.filter((result) => result.status === "HEALTHY").length;
        const redirectedLinks = results.filter((result) => result.status === "REDIRECTED").length;
        const brokenLinks = results.filter((result) => result.status === "BROKEN").length;

        return {
          postId: post.id,
          postTitle: post.title,
          postSlug: post.slug,
          published: post.published,
          totalLinks: results.length,
          healthyLinks,
          redirectedLinks,
          brokenLinks,
          results
        } satisfies PostExternalLinkAuditEntryRecord;
      })
  );

  return {
    checkedAt: new Date(),
    totalPostsChecked: posts.length,
    totalPostsWithLinks: entries.length,
    totalLinksChecked: entries.reduce((sum, entry) => sum + entry.totalLinks, 0),
    healthyLinks: entries.reduce((sum, entry) => sum + entry.healthyLinks, 0),
    redirectedLinks: entries.reduce((sum, entry) => sum + entry.redirectedLinks, 0),
    brokenLinks: entries.reduce((sum, entry) => sum + entry.brokenLinks, 0),
    entries
  };
}
