"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { runAiPostAutomation } from "@/lib/ai-post-automation";
import { prisma } from "@/lib/db";
import {
  fetchBrevoContactsFromList,
  fetchBrevoLists,
  getBrevoSettings,
  parseBrevoListIds,
  pushCampaignToBrevo,
  removeBrevoContactFromLists,
  resolveAudienceListIds,
  sendBrevoCampaignNow,
  sendBrevoCampaignTest,
  syncBrevoAudienceEmails
} from "@/lib/brevo";
import {
  clearAdminSession,
  requireAdminSession,
  setAdminSession,
  validateAdminCredentials
} from "@/lib/admin-auth";
import { normalizeCouponCode, parseCouponScopeInput, serializeCouponScope } from "@/lib/coupons";
import { ensureProductCodes, getNextProductCode } from "@/lib/product-codes";
import { normalizeArticleContent } from "@/lib/article-format";
import {
  buildFollowEmailSettingsEntries,
  FOLLOW_EMAIL_STAGE_ORDER,
  getEnabledAtKey
} from "@/lib/follow-emails";
import { sendConfiguredEmail, sendSmtpDiagnosticEmail } from "@/lib/email";
import { getMailboxOverview, updateMailboxReadState } from "@/lib/admin-mailbox";
import {
  generateEmailCampaignDraftWithAi,
  generateMailboxReplyWithAi
} from "@/lib/openai-email";
import {
  generateSeoPostImageFromProductReferenceWithAi,
  generateSeoPostImageWithAi
} from "@/lib/openai-posts";
import { generateAiReviewDrafts, getOpenAiReviewSettings } from "@/lib/openai-reviews";
import { getDefaultProductImageReferenceAsset } from "@/lib/product-media";
import { parseReviewReferenceFile } from "@/lib/review-reference-file";
import { approveRyoClaimReward } from "@/lib/ryo-claims";
import type {
  CouponDiscountType,
  EmailAudienceType,
  EmailCampaignRecord,
  EmailCampaignStatus,
  CouponUsageMode,
  FulfillmentStatus,
  OrderStatus,
  ProductStatus,
  ReviewStatus
} from "@/lib/types";
import { normalizeMultilineValue, slugify, toBool, toInt, toPlainString, toPriceCents } from "@/lib/utils";

function buildPublishedDate(formData: FormData, published: boolean) {
  const rawDate = toPlainString(formData.get("publishedAt"));
  if (!published) {
    return null;
  }
  return rawDate ? new Date(rawDate) : new Date();
}

function refreshStorefront(productSlugs: string[] = []) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/beauty-tips");

  for (const slug of productSlugs) {
    revalidatePath(`/shop/${slug}`);
  }
}

function buildProductPriceData(formData: FormData) {
  const priceCents = toPriceCents(formData.get("priceCents"));
  const compareAtPriceCents = toPriceCents(formData.get("compareAtPriceCents"));

  return {
    priceCents,
    compareAtPriceCents: compareAtPriceCents > priceCents ? compareAtPriceCents : null
  };
}

function buildReviewRedirect(status: string, redirectTo?: string, productSlug?: string) {
  const basePath = redirectTo || (productSlug ? `/admin/reviews/${productSlug}` : "/admin/reviews");
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildCouponRedirect(status: string, couponId?: string) {
  const basePath = couponId ? `/admin/coupons/${couponId}` : "/admin/coupons";
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}status=${status}`;
}

function buildFormSubmissionRedirect(status: string, redirectTo?: string, formKey?: string, submissionId?: string) {
  const fallbackPath = submissionId && formKey
    ? `/admin/forms/${formKey}/${submissionId}`
    : formKey
      ? `/admin/forms/${formKey}`
      : "/admin/forms";
  const basePath = redirectTo || fallbackPath;
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildOmbClaimRedirect(status: string, redirectTo?: string) {
  const basePath = redirectTo || "/admin/omb-claims";
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildRewardsRedirect(status: string, redirectTo?: string) {
  const basePath = redirectTo || "/admin/rewards";
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildMascotRedirect(status: string, mascotId?: string) {
  const basePath = mascotId ? `/admin/rewards/mascots/${mascotId}` : "/admin/rewards";
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}status=${status}`;
}

function buildEmailMarketingRedirect(status: string, campaignId?: string, redirectTo?: string) {
  const fallbackPath = campaignId ? `/admin/email-marketing/${campaignId}` : "/admin/email-marketing";
  const basePath = redirectTo || fallbackPath;
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildEmailRedirect(status: string, redirectTo?: string, detail?: string) {
  const basePath = redirectTo || "/admin/email";
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);

  if (detail) {
    params.set("detail", sanitizeEmailAdminDetail(detail));
  }

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function sanitizeEmailAdminDetail(value: string, maxLength = 240) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength)}...`;
}

function buildEmailComposeRedirect(input: {
  status: string;
  redirectTo?: string;
  uid?: number | null;
  reply?: boolean;
  contactSubmissionId?: string | null;
  composeTo?: string;
  composeSubject?: string;
  composeBody?: string;
  detail?: string;
}) {
  const basePath = input.redirectTo || "/admin/email";
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", input.status);

  if (input.uid && input.uid > 0) {
    params.set("uid", String(input.uid));
  }

  if (input.reply) {
    params.set("reply", "1");
  }

  if (input.contactSubmissionId) {
    params.set("contactSubmissionId", input.contactSubmissionId);
  }

  if (input.composeTo) {
    params.set("composeTo", input.composeTo);
  }

  if (input.composeSubject) {
    params.set("composeSubject", input.composeSubject);
  }

  if (input.composeBody) {
    params.set("composeBody", input.composeBody.slice(0, 1600));
  }

  if (input.detail) {
    params.set("detail", sanitizeEmailAdminDetail(input.detail));
  }

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildEmailAudienceRedirect(status: string, audienceType: EmailAudienceType, redirectTo?: string) {
  const fallbackPath = `/admin/email-marketing/audience/${audienceType}`;
  const basePath = redirectTo || fallbackPath;
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildPostsRedirect(status: string, redirectTo?: string) {
  const basePath = redirectTo || "/admin/posts";
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

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

function parseEmailCampaignStatus(value: string | undefined): EmailCampaignStatus {
  switch (value) {
    case "SYNCED":
      return "SYNCED";
    case "SCHEDULED":
      return "SCHEDULED";
    case "SENT":
      return "SENT";
    case "FAILED":
      return "FAILED";
    default:
      return "DRAFT";
  }
}

function parseDateTimeInput(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

async function getAudienceEmailsForSync(audienceType: EmailAudienceType) {
  const [newsletterRows, leadRows, optedInCustomers, importedContacts] = await Promise.all([
    prisma.formSubmission.findMany({
      where: {
        formKey: "subscribe"
      },
      select: {
        email: true
      },
      distinct: ["email"]
    }),
    prisma.formSubmission.findMany({
      where: {
        formKey: "contact"
      },
      select: {
        email: true
      },
      distinct: ["email"]
    }),
    prisma.customer.findMany({
      where: {
        marketingOptIn: true
      },
      select: {
        email: true
      }
    }),
    prisma.emailContact.findMany({
      where:
        audienceType === "ALL_MARKETING"
          ? {
              audienceType: {
                in: ["NEWSLETTER", "CUSTOMERS", "LEADS"]
              }
            }
          : {
              audienceType
            },
      select: {
        email: true
      },
      distinct: ["email"]
    })
  ]);

  const newsletterEmails = newsletterRows.map((row) => row.email);
  const leadEmails = leadRows.map((row) => row.email);
  const customerEmails = optedInCustomers.map((row) => row.email);
  const importedEmails = importedContacts.map((row) => row.email);

  if (audienceType === "NEWSLETTER") {
    return Array.from(new Set([...newsletterEmails, ...importedEmails]));
  }

  if (audienceType === "CUSTOMERS") {
    return Array.from(new Set([...customerEmails, ...importedEmails]));
  }

  if (audienceType === "LEADS") {
    return Array.from(new Set([...leadEmails, ...importedEmails]));
  }

  if (audienceType === "ALL_MARKETING") {
    return Array.from(new Set([...newsletterEmails, ...customerEmails, ...leadEmails, ...importedEmails]));
  }

  return importedEmails;
}

async function importAudienceContactsFromBrevo(input: {
  audienceType: EmailAudienceType;
  listIds: number[];
  listNameById?: Map<number, string>;
  settings: ReturnType<typeof getBrevoSettings>;
}) {
  const importedEmails = new Set<string>();
  let imported = 0;
  let failed = 0;

  for (const listId of input.listIds) {
    const contacts = await fetchBrevoContactsFromList({
      settings: input.settings,
      listId
    });

    for (const contact of contacts) {
      try {
        importedEmails.add(contact.email);

        await prisma.emailContact.upsert({
          where: {
            email_audienceType: {
              email: contact.email,
              audienceType: input.audienceType
            }
          },
          update: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            source: "BREVO_IMPORT",
            brevoContactId: contact.brevoContactId,
            brevoListId: listId,
            listName: input.listNameById?.get(listId) || `Brevo list ${listId}`,
            emailBlacklisted: contact.emailBlacklisted,
            metadata: contact.metadata,
            lastSyncedAt: new Date()
          },
          create: {
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            audienceType: input.audienceType,
            source: "BREVO_IMPORT",
            brevoContactId: contact.brevoContactId,
            brevoListId: listId,
            listName: input.listNameById?.get(listId) || `Brevo list ${listId}`,
            emailBlacklisted: contact.emailBlacklisted,
            metadata: contact.metadata,
            lastSyncedAt: new Date()
          }
        });

        imported += 1;
      } catch (error) {
        failed += 1;
        console.error("Brevo audience contact import failed:", error);
      }
    }
  }

  if (
    input.listIds.length === 1 &&
    (input.audienceType === "NEWSLETTER" || input.audienceType === "CUSTOMERS" || input.audienceType === "LEADS")
  ) {
    await prisma.emailContact.deleteMany({
      where: {
        audienceType: input.audienceType,
        source: "BREVO_IMPORT",
        email: {
          notIn: Array.from(importedEmails)
        }
      }
    });
  }

  return {
    imported,
    uniqueImported: importedEmails.size,
    failed
  };
}

function mapEmailCampaignRecord(campaign: any): EmailCampaignRecord {
  return {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    previewText: campaign.previewText ?? null,
    strategyBrief: campaign.strategyBrief ?? null,
    audienceType: campaign.audienceType,
    customListIds: campaign.customListIds ?? null,
    senderName: campaign.senderName ?? null,
    senderEmail: campaign.senderEmail ?? null,
    replyTo: campaign.replyTo ?? null,
    contentHtml: campaign.contentHtml,
    contentText: campaign.contentText ?? null,
    scheduledAt: campaign.scheduledAt ?? null,
    status: campaign.status,
    brevoCampaignId: campaign.brevoCampaignId ?? null,
    lastSyncedAt: campaign.lastSyncedAt ?? null,
    lastTestedAt: campaign.lastTestedAt ?? null,
    lastSentAt: campaign.lastSentAt ?? null,
    syncError: campaign.syncError ?? null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt
  };
}

function buildEmailCampaignPayload(formData: FormData) {
  const name = toPlainString(formData.get("name"));
  const subject = toPlainString(formData.get("subject"));
  const contentHtml = toPlainString(formData.get("contentHtml"));
  const audienceType = parseEmailAudienceType(toPlainString(formData.get("audienceType")));

  if (!name || !subject || !contentHtml) {
    return {
      error: "missing-fields" as const
    };
  }

  return {
    data: {
      name,
      subject,
      previewText: toPlainString(formData.get("previewText")) || null,
      strategyBrief: toPlainString(formData.get("strategyBrief")) || null,
      audienceType,
      customListIds:
        audienceType === "CUSTOM"
          ? parseBrevoListIds(toPlainString(formData.get("customListIds"))).join(", ") || null
          : null,
      senderName: toPlainString(formData.get("senderName")) || null,
      senderEmail: toPlainString(formData.get("senderEmail")) || null,
      replyTo: toPlainString(formData.get("replyTo")) || null,
      contentHtml,
      contentText: toPlainString(formData.get("contentText")) || null,
      scheduledAt: parseDateTimeInput(toPlainString(formData.get("scheduledAt"))),
      status: parseEmailCampaignStatus(toPlainString(formData.get("status")) || "DRAFT")
    }
  };
}

function parseCouponDiscountType(value: string | undefined): CouponDiscountType {
  return value === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENT";
}

function parseCouponUsageMode(value: string | undefined): CouponUsageMode {
  return value === "SINGLE_USE" ? "SINGLE_USE" : "UNLIMITED";
}

type CouponPayloadResult =
  | {
      error: "missing-fields" | "missing-scope" | "invalid-discount";
    }
  | {
      data: {
        code: string;
        content: string;
        active: boolean;
        combinable: boolean;
        appliesToAll: boolean;
        productCodes: string | null;
        discountType: CouponDiscountType;
        percentOff: number | null;
        amountOffCents: number | null;
        usageMode: CouponUsageMode;
        expiresAt: Date | null;
      };
    };

function buildCouponPayload(formData: FormData): CouponPayloadResult {
  const code = normalizeCouponCode(toPlainString(formData.get("code")));
  const content = toPlainString(formData.get("content"));
  const active = toBool(formData.get("active"));
  const combinable = toBool(formData.get("combinable"));
  const discountType = parseCouponDiscountType(toPlainString(formData.get("discountType")));
  const usageMode = parseCouponUsageMode(toPlainString(formData.get("usageMode")));
  const scope = parseCouponScopeInput(toPlainString(formData.get("scope")));
  const expiresAt = parseDateTimeInput(toPlainString(formData.get("expiresAt")));
  const percentOff =
    discountType === "PERCENT" ? Math.max(0, Math.min(100, toInt(formData.get("percentOff")))) : null;
  const amountOffCents =
    discountType === "FIXED_AMOUNT" ? Math.max(0, toPriceCents(formData.get("amountOffCents"))) : null;

  if (!code || !content) {
    return {
      error: "missing-fields" as const
    };
  }

  if (!scope.appliesToAll && scope.codes.length === 0) {
    return {
      error: "missing-scope" as const
    };
  }

  if (discountType === "PERCENT" && !percentOff) {
    return {
      error: "invalid-discount" as const
    };
  }

  if (discountType === "FIXED_AMOUNT" && !amountOffCents) {
    return {
      error: "invalid-discount" as const
    };
  }

  return {
    data: {
      code,
      content,
      combinable,
      appliesToAll: scope.appliesToAll,
      productCodes: scope.appliesToAll ? null : serializeCouponScope(scope.codes),
      discountType,
      percentOff,
      amountOffCents,
      usageMode,
      expiresAt,
      active: active && !(expiresAt && expiresAt.getTime() <= Date.now())
    }
  };
}

function buildMascotPayload(formData: FormData) {
  const sku = toPlainString(formData.get("sku")).toUpperCase();
  const name = toPlainString(formData.get("name"));
  const manualSlug = toPlainString(formData.get("slug"));
  const slug = slugify(manualSlug || name || sku);
  const imageUrl = toPlainString(formData.get("imageUrl"));
  const pointsCost = Math.max(1, toInt(formData.get("pointsCost"), 1000));

  if (!sku || !name || !slug || !imageUrl) {
    return {
      error: "missing-fields" as const
    };
  }

  return {
    data: {
      sku,
      name,
      slug,
      description: toPlainString(formData.get("description")) || null,
      imageUrl,
      pointsCost,
      active: toBool(formData.get("active")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), 0))
    }
  };
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parseReviewStatus(value: string | undefined): ReviewStatus {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "PENDING" || normalized === "HIDDEN" || normalized === "PUBLISHED") {
    return normalized;
  }

  return "PUBLISHED";
}

function parseCsvBoolean(value: string | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
}

function parseReviewDateInput(value: string | undefined | null) {
  const raw = (value || "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.length === 10 ? `${raw}T12:00:00.000Z` : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseAiReviewQuantity(value: FormDataEntryValue | null) {
  return Math.max(1, Math.min(100, toInt(value, 10)));
}

function parseAiReviewStarCount(value: FormDataEntryValue | null) {
  return Math.max(0, Math.min(100, toInt(value, 0)));
}

function shuffleNumbers(values: number[]) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function buildAiReviewRatingPlan(formData: FormData, quantity: number) {
  const distribution = [
    { rating: 5, count: parseAiReviewStarCount(formData.get("ratingCount5")) },
    { rating: 4, count: parseAiReviewStarCount(formData.get("ratingCount4")) },
    { rating: 3, count: parseAiReviewStarCount(formData.get("ratingCount3")) },
    { rating: 2, count: parseAiReviewStarCount(formData.get("ratingCount2")) },
    { rating: 1, count: parseAiReviewStarCount(formData.get("ratingCount1")) }
  ];

  const explicitTotal = distribution.reduce((sum, item) => sum + item.count, 0);

  if (explicitTotal === 0) {
    return null;
  }

  if (explicitTotal !== quantity) {
    return { error: "mismatch", ratings: [] as number[] };
  }

  const ratings = distribution.flatMap((item) => Array.from({ length: item.count }, () => item.rating));
  return { error: null, ratings: shuffleNumbers(ratings) };
}

function parseAiReviewDateRange(formData: FormData) {
  const today = new Date();
  const defaultEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)
  );
  const defaultStart = new Date(defaultEnd.getTime() - 180 * 24 * 60 * 60 * 1000);
  const rawStart = toPlainString(formData.get("reviewDateStart"));
  const rawEnd = toPlainString(formData.get("reviewDateEnd"));
  const start = rawStart
    ? new Date(`${rawStart}T00:00:00.000Z`)
    : defaultStart;
  const end = rawEnd
    ? new Date(`${rawEnd}T23:59:59.999Z`)
    : defaultEnd;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (end.getTime() < start.getTime()) {
    return null;
  }

  return { start, end };
}

function createRandomReviewDates(quantity: number, start: Date, end: Date) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const span = Math.max(1, endTime - startTime + 1);
  const timestamps = new Set<number>();

  while (timestamps.size < quantity) {
    const offset = randomInt(span);
    timestamps.add(startTime + offset);
  }

  return shuffleNumbers(Array.from(timestamps)).map((timestamp, index) => {
    const base = new Date(timestamp);
    return new Date(base.getTime() + index);
  });
}

export async function loginAction(formData: FormData) {
  const username = toPlainString(formData.get("username"));
  const password = toPlainString(formData.get("password"));

  if (!validateAdminCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }

  await setAdminSession(username);
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createProductAction(formData: FormData) {
  await requireAdminSession();

  await ensureProductCodes();
  const prices = buildProductPriceData(formData);
  const productCode = await getNextProductCode();

  const product = await prisma.product.create({
    data: {
      productCode,
      productShortName: toPlainString(formData.get("productShortName")) || null,
      amazonAsin: toPlainString(formData.get("amazonAsin")) || null,
      name: toPlainString(formData.get("name")),
      slug: toPlainString(formData.get("slug")),
      tagline: toPlainString(formData.get("tagline")),
      category: toPlainString(formData.get("category")),
      shortDescription: toPlainString(formData.get("shortDescription")),
      description: toPlainString(formData.get("description")),
      details: toPlainString(formData.get("details")),
      imageUrl: toPlainString(formData.get("imageUrl")),
      galleryImages: normalizeMultilineValue(formData.get("galleryImages")) || null,
      featured: toBool(formData.get("featured")),
      status: (toPlainString(formData.get("status")) || "DRAFT") as ProductStatus,
      inventory: toInt(formData.get("inventory")),
      priceCents: prices.priceCents,
      compareAtPriceCents: prices.compareAtPriceCents,
      currency: "USD",
      pointsReward: toInt(formData.get("pointsReward")),
      stripePriceId: toPlainString(formData.get("stripePriceId")) || null
    }
  });

  refreshStorefront([product.slug]);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}?status=created`);
}

export async function updateProductAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: {
      slug: true
    }
  });
  const prices = buildProductPriceData(formData);

  const product = await prisma.product.update({
    where: { id },
    data: {
      productShortName: toPlainString(formData.get("productShortName")) || null,
      amazonAsin: toPlainString(formData.get("amazonAsin")) || null,
      name: toPlainString(formData.get("name")),
      slug: toPlainString(formData.get("slug")),
      tagline: toPlainString(formData.get("tagline")),
      category: toPlainString(formData.get("category")),
      shortDescription: toPlainString(formData.get("shortDescription")),
      description: toPlainString(formData.get("description")),
      details: toPlainString(formData.get("details")),
      imageUrl: toPlainString(formData.get("imageUrl")),
      galleryImages: normalizeMultilineValue(formData.get("galleryImages")) || null,
      featured: toBool(formData.get("featured")),
      status: (toPlainString(formData.get("status")) || "DRAFT") as ProductStatus,
      inventory: toInt(formData.get("inventory")),
      priceCents: prices.priceCents,
      compareAtPriceCents: prices.compareAtPriceCents,
      pointsReward: toInt(formData.get("pointsReward")),
      stripePriceId: toPlainString(formData.get("stripePriceId")) || null
    }
  });

  refreshStorefront(
    [existingProduct?.slug, product.slug].filter((slug): slug is string => Boolean(slug))
  );
  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}?status=updated`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      slug: true
    }
  });

  await prisma.product.delete({ where: { id } });

  refreshStorefront(product?.slug ? [product.slug] : []);
  revalidatePath("/admin/products");
  redirect("/admin/products?status=deleted");
}

export async function createCouponAction(formData: FormData) {
  await requireAdminSession();

  const payload = buildCouponPayload(formData);

  if ("error" in payload) {
    redirect(buildCouponRedirect(payload.error));
  }

  try {
    const coupon = await prisma.coupon.create({
      data: payload.data
    });

    revalidatePath("/admin");
    revalidatePath("/admin/coupons");
    redirect(buildCouponRedirect("created", coupon.id));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(buildCouponRedirect("duplicate-code"));
    }

    throw error;
  }
}

export async function updateCouponAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const payload = buildCouponPayload(formData);

  if ("error" in payload) {
    redirect(buildCouponRedirect(payload.error, id));
  }

  try {
    await prisma.coupon.update({
      where: { id },
      data: payload.data
    });

    revalidatePath("/admin");
    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${id}`);
    redirect(buildCouponRedirect("updated", id));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(buildCouponRedirect("duplicate-code", id));
    }

    throw error;
  }
}

export async function toggleCouponStatusAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const nextActive = toPlainString(formData.get("nextActive")) === "true";
  const existingCoupon = await prisma.coupon.findUnique({
    where: { id },
    select: {
      expiresAt: true
    }
  });
  const canActivate = !existingCoupon?.expiresAt || existingCoupon.expiresAt.getTime() > Date.now();

  await prisma.coupon.update({
    where: { id },
    data: {
      active: nextActive ? canActivate : false
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${id}`);
  redirect(buildCouponRedirect(nextActive ? (canActivate ? "activated" : "expired") : "deactivated", id));
}

export async function toggleFormSubmissionHandledAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const formKey = toPlainString(formData.get("formKey"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const nextHandled = toPlainString(formData.get("nextHandled")) === "true";

  await prisma.formSubmission.update({
    where: { id },
    data: {
      handled: nextHandled,
      handledAt: nextHandled ? new Date() : null
    }
  });

  revalidatePath("/admin/forms");
  if (formKey) {
    revalidatePath(`/admin/forms/${formKey}`);
    revalidatePath(`/admin/forms/${formKey}/${id}`);
  }

  redirect(
    buildFormSubmissionRedirect(nextHandled ? "handled" : "reopened", redirectTo, formKey, id)
  );
}

export async function updateOmbClaimAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const giftSent = toBool(formData.get("giftSent"));
  const adminNote = toPlainString(formData.get("adminNote")) || null;

  await prisma.ombClaim.update({
    where: { id },
    data: {
      giftSent,
      giftSentAt: giftSent ? new Date() : null,
      adminNote
    }
  });

  revalidatePath("/admin/omb-claims");
  redirect(buildOmbClaimRedirect("updated", redirectTo));
}

export async function createPostAction(formData: FormData) {
  await requireAdminSession();

  const published = toBool(formData.get("published"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  await prisma.post.create({
    data: {
      title: toPlainString(formData.get("title")),
      slug: toPlainString(formData.get("slug")),
      excerpt: toPlainString(formData.get("excerpt")),
      category: toPlainString(formData.get("category")),
      readTime: toInt(formData.get("readTime"), 4),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")),
      coverImageAlt: toPlainString(formData.get("coverImageAlt")) || null,
      content: normalizeArticleContent(toPlainString(formData.get("content"))),
      seoTitle: toPlainString(formData.get("seoTitle")),
      seoDescription: toPlainString(formData.get("seoDescription")),
      published,
      publishedAt: buildPublishedDate(formData, published)
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect(buildPostsRedirect("created", redirectTo));
}

export async function updatePostAction(formData: FormData) {
  await requireAdminSession();

  const published = toBool(formData.get("published"));
  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      title: toPlainString(formData.get("title")),
      slug: toPlainString(formData.get("slug")),
      excerpt: toPlainString(formData.get("excerpt")),
      category: toPlainString(formData.get("category")),
      readTime: toInt(formData.get("readTime"), 4),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")),
      coverImageAlt: toPlainString(formData.get("coverImageAlt")) || null,
      content: normalizeArticleContent(toPlainString(formData.get("content"))),
      seoTitle: toPlainString(formData.get("seoTitle")),
      seoDescription: toPlainString(formData.get("seoDescription")),
      published,
      publishedAt: buildPublishedDate(formData, published)
    },
    select: {
      slug: true
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  revalidatePath(`/beauty-tips/${updatedPost.slug}`);
  revalidatePath(`/admin/posts/${id}`);
  redirect(buildPostsRedirect("updated", redirectTo));
}

export async function deletePostAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  await prisma.post.delete({ where: { id } });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect(buildPostsRedirect("deleted", redirectTo));
}

export async function regeneratePostImageAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || `/admin/posts/${id}`;

  if (!id) {
    redirect(buildPostsRedirect("missing-post", redirectTo));
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      sourceProduct: {
        select: {
          name: true,
          productCode: true,
          productShortName: true,
          slug: true
        }
      }
    }
  });

  if (!post) {
    redirect(buildPostsRedirect("missing-post", redirectTo));
  }

  const productReference =
    post.sourceProduct?.productShortName ||
    post.sourceProduct?.productCode ||
    post.sourceProduct?.name ||
    post.title;
  const basePrompt =
    toPlainString(formData.get("imagePrompt")) ||
    post.imagePrompt ||
    `Create a premium editorial skincare image for Neatique around ${productReference}.`;
  const finalPrompt = [
    basePrompt.trim(),
    "Preferred scenes are either a branded Neatique product setting or a polished model-use visual with no product visible.",
    "Do not show generic or unlabeled skincare packaging.",
    "If any product appears, it must clearly read as Neatique-branded.",
    "No text, no watermark, no collage, and no competitor branding."
  ].join(" ");
  const referenceImage = post.sourceProduct?.slug
    ? getDefaultProductImageReferenceAsset(post.sourceProduct.slug)
    : null;
  const imageAsset = referenceImage
    ? await generateSeoPostImageFromProductReferenceWithAi(finalPrompt, referenceImage)
    : await generateSeoPostImageWithAi(finalPrompt);

  await prisma.post.update({
    where: { id },
    data: {
      previewImageData: imageAsset.base64Data,
      previewImageMimeType: imageAsset.mimeType,
      previewImagePrompt: finalPrompt,
      previewImageGeneratedAt: new Date(),
      updatedAt: new Date()
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  if (post.slug) {
    revalidatePath(`/beauty-tips/${post.slug}`);
  }
  redirect(buildPostsRedirect("image-preview-generated", redirectTo));
}

export async function approvePostImagePreviewAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || `/admin/posts/${id}`;

  if (!id) {
    redirect(buildPostsRedirect("missing-post", redirectTo));
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      slug: true,
      previewImageData: true,
      previewImageMimeType: true,
      previewImagePrompt: true
    }
  });

  if (!post) {
    redirect(buildPostsRedirect("missing-post", redirectTo));
  }

  if (!post.previewImageData) {
    redirect(buildPostsRedirect("missing-image-preview", redirectTo));
  }

  await prisma.post.update({
    where: { id },
    data: {
      coverImageUrl: `/media/post/${id}?v=${Date.now()}`,
      coverImageData: post.previewImageData,
      coverImageMimeType: post.previewImageMimeType || "image/png",
      imagePrompt: post.previewImagePrompt || undefined,
      previewImageData: null,
      previewImageMimeType: null,
      previewImagePrompt: null,
      previewImageGeneratedAt: null,
      updatedAt: new Date()
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  if (post.slug) {
    revalidatePath(`/beauty-tips/${post.slug}`);
  }
  redirect(buildPostsRedirect("image-preview-approved", redirectTo));
}

export async function saveAiPostAutomationSettingsAction(formData: FormData) {
  await requireAdminSession();

  const settings = [
    ["ai_post_enabled", toBool(formData.get("ai_post_enabled")) ? "true" : "false"],
    ["ai_post_cadence_days", String(Math.max(1, toInt(formData.get("ai_post_cadence_days"), 2)))],
    ["ai_post_auto_publish", toBool(formData.get("ai_post_auto_publish")) ? "true" : "false"],
    [
      "ai_post_include_external_links",
      toBool(formData.get("ai_post_include_external_links")) ? "true" : "false"
    ]
  ];

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin/posts");
  redirect(buildPostsRedirect("automation-settings-saved"));
}

export async function generateAiPostNowAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/posts";
  const result = await runAiPostAutomation({
    trigger: "manual"
  });

  revalidatePath("/admin/posts");

  if (!result.ok) {
    redirect(buildPostsRedirect(`ai-failed-${slugify(result.status)}`, redirectTo));
  }

  if (!result.created) {
    redirect(buildPostsRedirect(`ai-skipped-${slugify(result.status)}`, redirectTo));
  }

  redirect(
    buildPostsRedirect(
      result.published ? "ai-post-published" : "ai-post-draft-created",
      redirectTo
    )
  );
}

export async function updateOrderAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await prisma.order.update({
    where: { id },
    data: {
      status: (toPlainString(formData.get("status")) || "PENDING") as OrderStatus,
      fulfillmentStatus: (toPlainString(formData.get("fulfillmentStatus")) ||
        "UNFULFILLED") as FulfillmentStatus,
      notes: toPlainString(formData.get("notes")) || null
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect("/admin/orders?status=updated");
}

export async function adjustCustomerPointsAction(formData: FormData) {
  await requireAdminSession();

  const customerId = toPlainString(formData.get("customerId"));
  const customerEmail = toPlainString(formData.get("customerEmail")).toLowerCase();
  const points = toInt(formData.get("points"));
  const note = toPlainString(formData.get("note")) || "Manual loyalty adjustment";
  const existingCustomer =
    customerId
      ? await prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, email: true }
        })
      : customerEmail
        ? await prisma.customer.findUnique({
            where: { email: customerEmail },
            select: { id: true, email: true }
          })
        : null;

  const customer =
    existingCustomer ??
    (customerEmail
      ? await prisma.customer.create({
          data: {
            email: customerEmail,
            marketingOptIn: false
          },
          select: {
            id: true,
            email: true
          }
        })
      : null);

  if (!customer?.id) {
    redirect("/admin/rewards?status=missing-customer");
  }

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: {
          increment: points
        }
      }
    }),
      prisma.rewardEntry.create({
        data: {
          customerId: customer.id,
          type: "ADJUSTMENT",
          points,
          note
        }
    })
  ]);

  revalidatePath("/admin/customers");
  revalidatePath("/admin/rewards");
  redirect("/admin/rewards?status=adjusted");
}

export async function createMascotRewardAction(formData: FormData) {
  await requireAdminSession();

  const payload = buildMascotPayload(formData);

  if ("error" in payload) {
    redirect("/admin/rewards/mascots/new?status=missing-fields");
  }

  const mascot = await prisma.mascotReward.create({
    data: payload.data
  });

  revalidatePath("/admin/rewards");
  revalidatePath("/rd");
  revalidatePath("/mascot");
  redirect(buildMascotRedirect("created", mascot.id));
}

export async function updateMascotRewardAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const payload = buildMascotPayload(formData);

  if (!id) {
    redirect(buildMascotRedirect("missing-mascot"));
  }

  if ("error" in payload) {
    redirect(buildMascotRedirect("missing-fields", id));
  }

  await prisma.mascotReward.update({
    where: { id },
    data: payload.data
  });

  revalidatePath("/admin/rewards");
  revalidatePath(`/admin/rewards/mascots/${id}`);
  revalidatePath("/rd");
  revalidatePath("/mascot");
  redirect(buildMascotRedirect("updated", id));
}

export async function updateMascotRedemptionAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/rewards";

  if (!id) {
    redirect(buildRewardsRedirect("missing-redemption", redirectTo));
  }

  const fulfilled = toBool(formData.get("fulfilled"));
  const adminNote = toPlainString(formData.get("adminNote")) || null;

  await prisma.mascotRedemption.update({
    where: { id },
    data: {
      status: fulfilled ? "FULFILLED" : "REQUESTED",
      fulfilledAt: fulfilled ? new Date() : null,
      adminNote
    }
  });

  revalidatePath("/admin/rewards");
  redirect(buildRewardsRedirect("redemption-updated", redirectTo));
}

export async function approveRyoClaimRewardAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/rewards";
  const adminNote = toPlainString(formData.get("adminNote")) || null;

  if (!id) {
    redirect(buildRewardsRedirect("missing-ryo-claim", redirectTo));
  }

  const result = await approveRyoClaimReward({
    claimId: id,
    adminNote
  });

  revalidatePath("/admin/rewards");
  revalidatePath("/account");
  revalidatePath("/rd");

  if (result.status === "missing") {
    redirect(buildRewardsRedirect("missing-ryo-claim", redirectTo));
  }

  if (result.status === "not-ready") {
    redirect(buildRewardsRedirect("ryo-not-ready", redirectTo));
  }

  if (result.status === "already-approved") {
    redirect(buildRewardsRedirect("ryo-already-approved", redirectTo));
  }

  redirect(buildRewardsRedirect("ryo-approved", redirectTo));
}

export async function updateCustomerAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await prisma.customer.update({
    where: { id },
    data: {
      firstName: toPlainString(formData.get("firstName")) || null,
      lastName: toPlainString(formData.get("lastName")) || null,
      marketingOptIn: toBool(formData.get("marketingOptIn"))
    }
  });

  revalidatePath("/admin/customers");
  redirect("/admin/customers?status=updated");
}

export async function updateReviewAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const nextStatus = parseReviewStatus(toPlainString(formData.get("status")));
  const nextReviewDate = parseReviewDateInput(toPlainString(formData.get("reviewDate")));
  const existingReview = await prisma.productReview.findUnique({
    where: { id },
    select: {
      reviewDate: true,
      publishedAt: true
    }
  });

  await prisma.productReview.update({
    where: { id },
    data: {
      rating: toInt(formData.get("rating"), 5),
      title: toPlainString(formData.get("title")),
      content: toPlainString(formData.get("content")),
      displayName: toPlainString(formData.get("displayName")),
      reviewDate: nextReviewDate ?? existingReview?.reviewDate ?? new Date(),
      status: nextStatus,
      verifiedPurchase: toBool(formData.get("verifiedPurchase")),
      adminNotes: toPlainString(formData.get("adminNotes")) || null,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? existingReview?.publishedAt ?? nextReviewDate ?? new Date()
          : null
    }
  });

  revalidatePath("/admin/reviews");
  if (productSlug) {
    revalidatePath(`/admin/reviews/${productSlug}`);
  }
  refreshStorefront(productSlug ? [productSlug] : []);
  redirect(buildReviewRedirect("updated", redirectTo, productSlug));
}

export async function deleteReviewAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  await prisma.productReview.delete({
    where: { id }
  });

  revalidatePath("/admin/reviews");
  if (productSlug) {
    revalidatePath(`/admin/reviews/${productSlug}`);
  }
  refreshStorefront(productSlug ? [productSlug] : []);
  redirect(buildReviewRedirect("deleted", redirectTo, productSlug));
}

export async function approveReviewAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  if (!id) {
    redirect(buildReviewRedirect("missing-review", redirectTo, productSlug));
  }

  const existingReview = await prisma.productReview.findUnique({
    where: { id },
    select: {
      publishedAt: true
    }
  });

  await prisma.productReview.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: existingReview?.publishedAt ?? new Date()
    }
  });

  revalidatePath("/admin/reviews");
  if (productSlug) {
    revalidatePath(`/admin/reviews/${productSlug}`);
  }
  refreshStorefront(productSlug ? [productSlug] : []);
  redirect(buildReviewRedirect("approved", redirectTo, productSlug));
}

export async function bulkModerateReviewsAction(formData: FormData) {
  await requireAdminSession();

  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const intent = toPlainString(formData.get("intent")) || "delete";
  const reviewIds = Array.from(
    new Set(
      formData
        .getAll("reviewIds")
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );

  if (reviewIds.length === 0) {
    redirect(buildReviewRedirect("no-selection", redirectTo, productSlug));
  }

  if (intent === "approve") {
    await prisma.productReview.updateMany({
      where: {
        id: {
          in: reviewIds
        }
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date()
      }
    });
  } else if (intent === "mark-verified") {
    await prisma.productReview.updateMany({
      where: {
        id: {
          in: reviewIds
        }
      },
      data: {
        verifiedPurchase: true
      }
    });
  } else if (intent === "mark-unverified") {
    await prisma.productReview.updateMany({
      where: {
        id: {
          in: reviewIds
        }
      },
      data: {
        verifiedPurchase: false
      }
    });
  } else {
    await prisma.productReview.deleteMany({
      where: {
        id: {
          in: reviewIds
        }
      }
    });
  }

  revalidatePath("/admin/reviews");
  if (productSlug) {
    revalidatePath(`/admin/reviews/${productSlug}`);
  }
  refreshStorefront(productSlug ? [productSlug] : []);
  redirect(
    buildReviewRedirect(
      intent === "approve"
        ? "bulk-approved"
        : intent === "mark-verified"
          ? "bulk-verified"
          : intent === "mark-unverified"
            ? "bulk-unverified"
            : "bulk-deleted",
      redirectTo,
      productSlug
    )
  );
}

export async function generateAiReviewsAction(formData: FormData) {
  await requireAdminSession();

  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const quantity = parseAiReviewQuantity(formData.get("quantity"));
  const ratingPlanResult = buildAiReviewRatingPlan(formData, quantity);
  const reviewDateRange = parseAiReviewDateRange(formData);
  const generationMode = toPlainString(formData.get("generationMode")) === "reference" ? "reference" : "direct";
  const referenceFile = formData.get("referenceFile");
  const openAiSettings = getOpenAiReviewSettings();

  if (ratingPlanResult?.error === "mismatch") {
    redirect(buildReviewRedirect("rating-distribution-mismatch", redirectTo, productSlug));
  }

  if (!reviewDateRange) {
    redirect(buildReviewRedirect("invalid-date-range", redirectTo, productSlug));
  }

  if (!openAiSettings.ready) {
    redirect(buildReviewRedirect("ai-not-configured", redirectTo, productSlug));
  }

  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: {
      id: true,
      productCode: true,
      productShortName: true,
      name: true,
      slug: true,
      tagline: true,
      category: true,
      shortDescription: true,
      description: true,
      details: true
    }
  });

  if (!product) {
    redirect(buildReviewRedirect("missing-product", redirectTo, productSlug));
  }

  const hasUploadedReferenceFile =
    referenceFile &&
    typeof referenceFile !== "string" &&
    typeof referenceFile.name === "string" &&
    referenceFile.name.trim().length > 0;

  if (generationMode === "reference" && !hasUploadedReferenceFile) {
    redirect(buildReviewRedirect("missing-reference-file", redirectTo, productSlug));
  }

  const referenceReviews =
    generationMode === "reference" ? await parseReviewReferenceFile(referenceFile) : [];

  if (generationMode === "reference" && hasUploadedReferenceFile && referenceReviews.length === 0) {
    redirect(buildReviewRedirect("invalid-reference-file", redirectTo, productSlug));
  }

  const existingReviews = await prisma.productReview.findMany({
    where: { productId: product.id },
    orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      rating: true,
      title: true,
      content: true,
      displayName: true
    }
  });

  try {
    const drafts = await generateAiReviewDrafts({
      product,
      quantity,
      existingReviews,
      referenceReviews,
      requiredRatings: ratingPlanResult?.ratings || undefined
    });

    const reviewDates = createRandomReviewDates(quantity, reviewDateRange.start, reviewDateRange.end);

    for (const [index, draft] of drafts.entries()) {
      const createdAt = reviewDates[index] || new Date();
      await prisma.productReview.create({
        data: {
          productId: product.id,
          rating: draft.rating,
          title: draft.title,
          content: draft.content,
          displayName: draft.displayName,
          reviewDate: createdAt,
          status: "PENDING",
          verifiedPurchase: true,
          adminNotes: referenceReviews.length
            ? `AI generated with ${referenceReviews.length} uploaded reference reviews.`
            : "AI generated directly from product context, with no reference file.",
          source: "AI_GENERATED",
          createdAt
        }
      });
    }
  } catch {
    redirect(buildReviewRedirect("ai-failed", redirectTo, product.slug));
  }

  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${product.slug}`);
  redirect(buildReviewRedirect("ai-generated", redirectTo, product.slug));
}

export async function bulkImportReviewsAction(formData: FormData) {
  await requireAdminSession();

  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const file = formData.get("csvFile");
  const raw =
    file && typeof file === "object" && "text" in file && typeof file.text === "function"
      ? await file.text()
      : toPlainString(formData.get("rows"));

  if (!raw) {
    redirect(buildReviewRedirect("empty", redirectTo, productSlug));
  }

  const rows = parseCsv(raw);

  if (rows.length < 2) {
    redirect(buildReviewRedirect("invalid-csv", redirectTo, productSlug));
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = new Map(headerRow.map((cell, index) => [normalizeCsvHeader(cell), index]));
  const productSlugIndex = headerMap.get("productslug");
  const displayNameIndex = headerMap.get("displayname");
  const emailIndex = headerMap.get("email");
  const ratingIndex = headerMap.get("rating");
  const titleIndex = headerMap.get("title");
  const contentIndex = headerMap.get("content");
  const verifiedPurchaseIndex = headerMap.get("verifiedpurchase");
  const statusIndex = headerMap.get("status");
  const reviewDateIndex = headerMap.get("reviewdate");

  if (
    displayNameIndex === undefined ||
    ratingIndex === undefined ||
    titleIndex === undefined ||
    contentIndex === undefined
  ) {
    redirect(buildReviewRedirect("invalid-columns", redirectTo, productSlug));
  }

  const products = await prisma.product.findMany({
    where: productSlug
      ? {
          slug: productSlug
        }
      : undefined,
    select: {
      id: true,
      slug: true
    }
  });
  const productBySlug = new Map(products.map((product) => [product.slug, product]));

  for (const row of dataRows) {
    const rowProductSlug = productSlug || (productSlugIndex !== undefined ? row[productSlugIndex] : "");
    const product = rowProductSlug ? productBySlug.get(rowProductSlug) : null;
    const nextStatus = parseReviewStatus(statusIndex !== undefined ? row[statusIndex] : undefined);
    const parsedReviewDate = parseReviewDateInput(
      reviewDateIndex !== undefined ? row[reviewDateIndex] : undefined
    );

    if (!product) {
      continue;
    }

    const email = emailIndex !== undefined ? row[emailIndex] : "";
    const customer = email
      ? await prisma.customer.findUnique({
          where: { email }
        })
      : null;

    await prisma.productReview.create({
      data: {
        productId: product.id,
        customerId: customer?.id ?? null,
        rating: toInt(row[ratingIndex], 5),
        title: row[titleIndex] || "",
        content: row[contentIndex] || "",
        displayName: row[displayNameIndex] || customer?.email || "Verified customer",
        verifiedPurchase:
          verifiedPurchaseIndex !== undefined
            ? parseCsvBoolean(row[verifiedPurchaseIndex])
            : true,
        reviewDate: parsedReviewDate ?? new Date(),
        status: nextStatus,
        publishedAt: nextStatus === "PUBLISHED" ? parsedReviewDate ?? new Date() : null,
        source: "ADMIN_IMPORT"
      }
    });
  }

  revalidatePath("/admin/reviews");
  if (productSlug) {
    revalidatePath(`/admin/reviews/${productSlug}`);
  }
  refreshStorefront(productSlug ? [productSlug] : []);
  redirect(buildReviewRedirect("imported", redirectTo, productSlug));
}

export async function saveStoreSettingsAction(formData: FormData) {
  await requireAdminSession();

  const settings = [
    ["shipping_region", toPlainString(formData.get("shipping_region"))],
    ["support_email", toPlainString(formData.get("support_email"))],
    ["reward_rule", toPlainString(formData.get("reward_rule"))],
    ["stripe_mode", toPlainString(formData.get("stripe_mode"))]
  ];

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin");
  redirect("/admin?status=settings-saved");
}

export async function saveEmailSettingsAction(formData: FormData) {
  await requireAdminSession();

  const settings = [
    ["email_enabled", toBool(formData.get("email_enabled")) ? "true" : "false"],
    ["smtp_host", toPlainString(formData.get("smtp_host"))],
    ["smtp_port", toPlainString(formData.get("smtp_port")) || "587"],
    ["smtp_secure", toBool(formData.get("smtp_secure")) ? "true" : "false"],
    ["smtp_user", toPlainString(formData.get("smtp_user"))],
    ["smtp_pass", toPlainString(formData.get("smtp_pass"))],
    ["email_from_name", toPlainString(formData.get("email_from_name")) || "Neatique Beauty"],
    ["email_from_address", toPlainString(formData.get("email_from_address"))],
    ["contact_recipient", toPlainString(formData.get("contact_recipient"))],
    ["imap_host", toPlainString(formData.get("imap_host"))],
    ["imap_port", toPlainString(formData.get("imap_port")) || "993"],
    ["imap_secure", toBool(formData.get("imap_secure")) ? "true" : "false"],
    ["imap_user", toPlainString(formData.get("imap_user"))],
    ["imap_pass", toPlainString(formData.get("imap_pass"))],
    ["imap_mailbox", toPlainString(formData.get("imap_mailbox")) || "INBOX"]
  ];

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin/email");
  redirect("/admin/email?status=saved");
}

export async function sendAdminMailboxEmailAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/email";
  const contactSubmissionId = toPlainString(formData.get("contactSubmissionId")) || null;
  const to = toPlainString(formData.get("to"));
  const subject = toPlainString(formData.get("subject"));
  const body = toPlainString(formData.get("body"));
  const replyTo = toPlainString(formData.get("replyTo")) || undefined;
  const sourceSenderName = toPlainString(formData.get("sourceSenderName")) || null;
  const sourceSenderEmail = toPlainString(formData.get("sourceSenderEmail")) || null;
  const sourceSubject = toPlainString(formData.get("sourceSubject")) || null;
  const sourceSnippet = clipMailboxSourceSnippet(toPlainString(formData.get("sourceSnippet"))) || null;

  if (!to || !subject || !body) {
    redirect(buildEmailRedirect("send-missing-fields", redirectTo));
  }

  try {
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.8;color:#2e2825;white-space:pre-wrap">
        ${body
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")}
      </div>
    `;

    const result = await sendConfiguredEmail({
      to,
      subject,
      text: body,
      html,
      replyTo
    });

    if (result.delivered) {
      const recipientEmails = parseMailboxRecipientList(to);

      if (recipientEmails.length > 0) {
        await prisma.mailboxReplyExample.createMany({
          data: recipientEmails.map((email) => ({
            toEmail: email,
            subject,
            bodyText: body,
            replyTo: replyTo || null,
            sourceSenderName,
            sourceSenderEmail,
            sourceSubject,
            sourceSnippet
          }))
        });
      }

      if (contactSubmissionId) {
        await prisma.formSubmission.updateMany({
          where: {
            id: contactSubmissionId,
            formKey: "contact"
          },
          data: {
            handled: true,
            handledAt: new Date()
          }
        });
        revalidatePath("/admin/forms");
        revalidatePath("/admin/forms/contact");
        revalidatePath(`/admin/forms/contact/${contactSubmissionId}`);
      }
    }

    if (!result.delivered) {
      redirect(
        buildEmailComposeRedirect({
          status: "mail-send-failed",
          redirectTo,
          contactSubmissionId,
          composeTo: to,
          composeSubject: subject,
          composeBody: body,
          detail: result.reason
        })
      );
    }

    redirect(
      buildEmailRedirect(
        contactSubmissionId ? "mail-sent-contact-handled" : "mail-sent",
        redirectTo
      )
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Admin mailbox send failed:", error);
    redirect(
      buildEmailComposeRedirect({
        status: "mail-send-failed",
        redirectTo,
        contactSubmissionId,
        composeTo: to,
        composeSubject: subject,
        composeBody: body,
        detail: error instanceof Error ? error.message : "Unknown email send error."
      })
    );
  }
}

export async function sendAdminSmtpTestEmailAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/email";
  const testEmail = toPlainString(formData.get("testEmail"));

  if (!testEmail) {
    redirect(buildEmailRedirect("smtp-test-missing-email", redirectTo));
  }

  try {
    const result = await sendSmtpDiagnosticEmail({
      to: testEmail
    });

    if (!result.delivered) {
      redirect(buildEmailRedirect("smtp-test-failed", redirectTo, result.reason));
    }

    redirect(buildEmailRedirect("smtp-test-sent", redirectTo, `Test email sent to ${testEmail}.`));
  } catch (error) {
    unstable_rethrow(error);
    console.error("SMTP diagnostic send failed:", error);
    redirect(
      buildEmailRedirect(
        "smtp-test-failed",
        redirectTo,
        error instanceof Error ? error.message : "Unknown SMTP test error."
      )
    );
  }
}

export async function updateMailboxReadStateAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/email";
  const uid = toInt(formData.get("uid"));
  const unread = toBool(formData.get("unread"));

  if (!uid || uid <= 0) {
    redirect(buildEmailRedirect("mailbox-message-missing", redirectTo));
  }

  try {
    await updateMailboxReadState({ uid, unread });
    redirect(buildEmailRedirect(unread ? "mail-marked-unread" : "mail-marked-read", redirectTo));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Mailbox read state update failed:", error);
    redirect(buildEmailRedirect("mailbox-update-failed", redirectTo));
  }
}

function buildReplySubjectForMailbox(subject: string) {
  const trimmed = subject.trim();
  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

function parseMailboxRecipientList(rawTo: string) {
  return rawTo
    .split(/[,;\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
}

function clipMailboxSourceSnippet(value: string, maxLength = 420) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength)}...`;
}

function buildQuotedContactSubmissionForCompose(input: {
  email: string;
  subject: string | null;
  message: string | null;
  createdAt: Date;
}) {
  const original = (input.message || "").trim();
  const clipped = original.length > 3000 ? `${original.slice(0, 3000)}...` : original;

  return [
    `----- Original contact message (${input.createdAt.toLocaleString("en-US")}) -----`,
    `Email: ${input.email}`,
    `Subject: ${input.subject || "No subject"}`,
    clipped || "No message body was provided."
  ].join("\n");
}

async function loadMailboxReplyStyleExamples(targetEmail: string | null) {
  const normalizedTarget = (targetEmail || "").trim().toLowerCase();

  const [targetRows, recentRows] = await Promise.all([
    normalizedTarget
      ? prisma.mailboxReplyExample.findMany({
          where: { toEmail: normalizedTarget },
          orderBy: { createdAt: "desc" },
          take: 4
        })
      : Promise.resolve([]),
    prisma.mailboxReplyExample.findMany({
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const merged = [...targetRows, ...recentRows];
  const unique = new Map<string, (typeof merged)[number]>();
  for (const row of merged) {
    if (!unique.has(row.id)) {
      unique.set(row.id, row);
    }
  }

  return Array.from(unique.values())
    .slice(0, 6)
    .map((row) => ({
      subject: row.subject,
      bodyText: row.bodyText,
      sourceSubject: row.sourceSubject,
      sourceSnippet: row.sourceSnippet
    }));
}

export async function generateAdminMailboxReplyAiAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/email";
  const uid = toInt(formData.get("uid"));
  const contactSubmissionId = toPlainString(formData.get("contactSubmissionId")) || null;
  const senderName = toPlainString(formData.get("senderName")) || "Tracy";
  const senderEmail = toPlainString(formData.get("senderEmail")) || "support@neatiquebeauty.com";

  if ((!uid || uid <= 0) && !contactSubmissionId) {
    redirect(buildEmailRedirect("mailbox-message-missing", redirectTo));
  }

  try {
    if (contactSubmissionId) {
      const submission = await prisma.formSubmission.findFirst({
        where: {
          id: contactSubmissionId,
          formKey: "contact"
        },
        select: {
          id: true,
          email: true,
          name: true,
          subject: true,
          message: true,
          createdAt: true
        }
      });

      if (!submission) {
        redirect(buildEmailRedirect("mailbox-message-missing", redirectTo));
      }

      const styleExamples = await loadMailboxReplyStyleExamples(submission.email);
      const result = await generateMailboxReplyWithAi({
        senderName,
        senderEmail,
        customerName: submission.name,
        customerEmail: submission.email,
        subject: submission.subject || "Contact form message",
        messageText: submission.message || "",
        receivedAt: submission.createdAt,
        styleExamples
      });

      redirect(
        buildEmailComposeRedirect({
          status: "ai-reply-generated",
          redirectTo,
          contactSubmissionId: submission.id,
          composeTo: submission.email,
          composeSubject: buildReplySubjectForMailbox(submission.subject || "Your message to Neatique"),
          composeBody: `${result.replyText}\n\n${buildQuotedContactSubmissionForCompose({
            email: submission.email,
            subject: submission.subject,
            message: submission.message,
            createdAt: submission.createdAt
          })}`
        })
      );
    }

    const mailbox = await getMailboxOverview(uid, 1);
    const message = mailbox.selectedMessage;

    if (!message) {
      redirect(buildEmailRedirect("mailbox-message-missing", redirectTo));
    }

    const targetEmail = (message.replyToEmail || message.fromEmail || "").trim().toLowerCase() || null;
    const styleExamples = await loadMailboxReplyStyleExamples(targetEmail);

    const result = await generateMailboxReplyWithAi({
      senderName,
      senderEmail,
      customerName: message.fromName,
      customerEmail: message.fromEmail,
      subject: message.subject,
      messageText: message.textBody || message.htmlBody || "",
      receivedAt: message.receivedAt,
      styleExamples
    });

    redirect(
      buildEmailComposeRedirect({
        status: "ai-reply-generated",
        redirectTo,
        uid,
        reply: true,
        composeTo: message.replyToEmail || message.fromEmail || "",
        composeSubject: buildReplySubjectForMailbox(message.subject),
        composeBody: result.replyText
      })
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("AI mailbox reply generation failed:", error);
    redirect(buildEmailRedirect("ai-reply-failed", redirectTo));
  }
}

export async function saveEmailMarketingSettingsAction(formData: FormData) {
  await requireAdminSession();

  const existingSettings = await loadStoreSettingsMap();
  const nextApiKey = toPlainString(formData.get("brevo_api_key")) || existingSettings.brevo_api_key || "";
  const settings = [
    ["brevo_enabled", toBool(formData.get("brevo_enabled")) ? "true" : "false"],
    ["brevo_sync_subscribe", toBool(formData.get("brevo_sync_subscribe")) ? "true" : "false"],
    ["brevo_sync_contact", toBool(formData.get("brevo_sync_contact")) ? "true" : "false"],
    ["brevo_sync_customers", toBool(formData.get("brevo_sync_customers")) ? "true" : "false"],
    ["brevo_api_key", nextApiKey],
    ["brevo_sender_name", toPlainString(formData.get("brevo_sender_name")) || "Neatique Beauty"],
    ["brevo_sender_email", toPlainString(formData.get("brevo_sender_email"))],
    ["brevo_reply_to", toPlainString(formData.get("brevo_reply_to"))],
    ["brevo_test_email", toPlainString(formData.get("brevo_test_email"))],
    ["brevo_subscribers_list_id", parseBrevoListIds(toPlainString(formData.get("brevo_subscribers_list_id"))).join(", ")],
    ["brevo_contact_list_id", parseBrevoListIds(toPlainString(formData.get("brevo_contact_list_id"))).join(", ")],
    ["brevo_customers_list_id", parseBrevoListIds(toPlainString(formData.get("brevo_customers_list_id"))).join(", ")]
  ];

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin/email-marketing");
  redirect("/admin/email-marketing?status=settings-saved");
}

export async function saveFollowEmailSettingsAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/omb-claims";
  const processKey = toPlainString(formData.get("processKey")) === "RYO" ? "RYO" : "OMB";
  const delayMinutes = Math.max(1, toInt(formData.get("delayMinutes"), 30));
  const enabled = toBool(formData.get("enabled"));
  const existingSettings = await loadStoreSettingsMap();
  const enabledAtKey = getEnabledAtKey(processKey);
  const wasEnabled =
    existingSettings[processKey === "OMB" ? "omb_follow_enabled" : "ryo_follow_enabled"] === "true";

  const subjects = Object.fromEntries(
    FOLLOW_EMAIL_STAGE_ORDER.map((stageKey) => [
      stageKey,
      toPlainString(formData.get(`subject_${stageKey}`))
    ])
  );
  const bodies = Object.fromEntries(
    FOLLOW_EMAIL_STAGE_ORDER.map((stageKey) => [
      stageKey,
      toPlainString(formData.get(`body_${stageKey}`))
    ])
  );

  const settings = buildFollowEmailSettingsEntries(processKey, {
    enabled,
    delayMinutes,
    subjects,
    bodies
  });

  if (enabled && !wasEnabled) {
    settings.push([enabledAtKey, new Date().toISOString()]);
  }

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin/omb-claims");
  revalidatePath("/admin/rewards");
  redirect(
    processKey === "OMB"
      ? buildOmbClaimRedirect("follow-email-settings-saved", redirectTo)
      : buildRewardsRedirect("follow-email-settings-saved", redirectTo)
  );
}

export async function importBrevoAudienceAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/email-marketing";
  const audienceType = parseEmailAudienceType(toPlainString(formData.get("audienceType")));
  const customListIds = toPlainString(formData.get("customListIds")) || null;
  const settingsMap = await loadStoreSettingsMap();
  const brevoSettings = getBrevoSettings(settingsMap);

  if (!brevoSettings.enabled || !brevoSettings.apiKeyConfigured) {
    redirect(buildEmailMarketingRedirect("brevo-not-configured", undefined, redirectTo));
  }

  const targetListIds = resolveAudienceListIds(audienceType, brevoSettings, customListIds);

  if (targetListIds.length === 0) {
    redirect(buildEmailMarketingRedirect("missing-list", undefined, redirectTo));
  }

  let nextStatus = "audience-import-failed";

  try {
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

    nextStatus =
      result.failed > 0
        ? result.uniqueImported > 0
          ? "audience-import-partial"
          : "audience-import-failed"
        : result.uniqueImported > 0
          ? "audience-import-complete"
          : "audience-import-empty";
  } catch (error) {
    console.error("Brevo audience import failed:", error);
  }

  revalidatePath("/admin/email-marketing");
  redirect(buildEmailMarketingRedirect(nextStatus, undefined, redirectTo));
}

export async function deleteEmailAudienceContactAction(formData: FormData) {
  await requireAdminSession();

  const email = toPlainString(formData.get("email")).toLowerCase();
  const audienceType = parseEmailAudienceType(toPlainString(formData.get("audienceType")));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const settingsMap = await loadStoreSettingsMap();
  const brevoSettings = getBrevoSettings(settingsMap);
  const targetListIds = resolveAudienceListIds(audienceType, brevoSettings, null);

  if (!email) {
    redirect(buildEmailAudienceRedirect("missing-email", audienceType, redirectTo));
  }

  let nextStatus = "remove-failed";

  try {
    if (targetListIds.length > 0 && brevoSettings.enabled && brevoSettings.apiKeyConfigured) {
      await removeBrevoContactFromLists({
        settings: brevoSettings,
        email,
        listIds: targetListIds
      });
    }

    await prisma.emailContact.deleteMany({
      where: {
        email,
        audienceType
      }
    });

    nextStatus = "contact-removed";
  } catch (error) {
    console.error("Brevo audience contact removal failed:", error);
  }

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/audience/${audienceType}`);
  redirect(buildEmailAudienceRedirect(nextStatus, audienceType, redirectTo));
}

export async function syncBrevoAudienceAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = toPlainString(formData.get("redirectTo")) || "/admin/email-marketing";
  const audienceType = parseEmailAudienceType(toPlainString(formData.get("audienceType")));
  const customListIds = toPlainString(formData.get("customListIds")) || null;
  const settingsMap = await loadStoreSettingsMap();
  const brevoSettings = getBrevoSettings(settingsMap);

  if (!brevoSettings.enabled || !brevoSettings.apiKeyConfigured) {
    redirect(buildEmailMarketingRedirect("brevo-not-configured", undefined, redirectTo));
  }

  const targetListIds = resolveAudienceListIds(audienceType, brevoSettings, customListIds);

  if (targetListIds.length === 0) {
    redirect(buildEmailMarketingRedirect("missing-list", undefined, redirectTo));
  }

  const emails = await getAudienceEmailsForSync(audienceType);

  const result = await syncBrevoAudienceEmails({
    settings: brevoSettings,
    emails,
    listIds: targetListIds
  });

  revalidatePath("/admin/email-marketing");
  redirect(
    buildEmailMarketingRedirect(
      result.failed > 0 ? "audience-sync-partial" : "audience-sync-complete",
      undefined,
      redirectTo
    )
  );
}

export async function generateEmailCampaignWithAiAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  if (!id) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const [campaign, settingsMap, products] = await Promise.all([
    prisma.emailCampaign.findUnique({
      where: { id }
    }),
    loadStoreSettingsMap(),
    prisma.product.findMany({
      where: {
        status: "ACTIVE"
      },
      select: {
        name: true,
        slug: true,
        tagline: true,
        shortDescription: true,
        priceCents: true,
        compareAtPriceCents: true
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
    })
  ]);

  if (!campaign) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  if (!campaign.strategyBrief?.trim()) {
    redirect(buildEmailMarketingRedirect("ai-missing-brief", id, redirectTo));
  }

  const brevoSettings = getBrevoSettings(settingsMap);

  let nextStatus = "ai-error";

  try {
    const aiDraft = await generateEmailCampaignDraftWithAi({
      campaignName: campaign.name,
      audienceType: campaign.audienceType,
      strategyBrief: campaign.strategyBrief,
      senderName: campaign.senderName || brevoSettings.senderName,
      senderEmail: campaign.senderEmail || brevoSettings.senderEmail,
      replyTo: campaign.replyTo || brevoSettings.replyTo,
      products
    });

    await prisma.emailCampaign.update({
      where: { id },
      data: {
        subject: aiDraft.subject,
        previewText: aiDraft.previewText,
        contentHtml: aiDraft.contentHtml,
        contentText: aiDraft.contentText,
        senderName: campaign.senderName || brevoSettings.senderName || null,
        senderEmail: campaign.senderEmail || brevoSettings.senderEmail || null,
        replyTo: campaign.replyTo || brevoSettings.replyTo || null,
        status: "DRAFT",
        syncError: null
      }
    });
    nextStatus = "ai-generated";
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        syncError: error instanceof Error ? error.message : "AI generation failed."
      }
    });
  }

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/${id}`);
  redirect(buildEmailMarketingRedirect(nextStatus, id, redirectTo));
}

export async function createEmailCampaignAction(formData: FormData) {
  await requireAdminSession();

  const payload = buildEmailCampaignPayload(formData);

  if ("error" in payload) {
    redirect(buildEmailMarketingRedirect("missing-fields", undefined, "/admin/email-marketing/new"));
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      ...payload.data,
      status: "DRAFT",
      syncError: null,
      brevoCampaignId: null,
      lastSyncedAt: null,
      lastTestedAt: null,
      lastSentAt: null
    }
  });

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/${campaign.id}`);
  redirect(buildEmailMarketingRedirect("created", campaign.id));
}

export async function updateEmailCampaignAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const payload = buildEmailCampaignPayload(formData);

  if (!id) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  if ("error" in payload) {
    redirect(buildEmailMarketingRedirect("missing-fields", id, redirectTo));
  }

  await prisma.emailCampaign.update({
    where: { id },
    data: {
      ...payload.data,
      status: "DRAFT",
      syncError: null
    }
  });

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/${id}`);
  redirect(buildEmailMarketingRedirect("updated", id, redirectTo));
}

export async function deleteEmailCampaignAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  if (!id) {
    redirect(buildEmailMarketingRedirect("missing-campaign"));
  }

  await prisma.emailCampaign.delete({
    where: { id }
  });

  revalidatePath("/admin/email-marketing");
  redirect(buildEmailMarketingRedirect("deleted"));
}

export async function syncEmailCampaignToBrevoAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  if (!id) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const [campaign, settingsMap] = await Promise.all([
    prisma.emailCampaign.findUnique({
      where: { id }
    }),
    loadStoreSettingsMap()
  ]);

  if (!campaign) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const brevoSettings = getBrevoSettings(settingsMap);

  let nextStatus = "brevo-error";

  try {
    const pushResult = await pushCampaignToBrevo({
      settings: brevoSettings,
      campaign: mapEmailCampaignRecord(campaign)
    });

    await prisma.emailCampaign.update({
      where: { id },
      data: {
        brevoCampaignId: pushResult.brevoCampaignId,
        lastSyncedAt: new Date(),
        status: campaign.scheduledAt ? "SCHEDULED" : "SYNCED",
        syncError: null
      }
    });
    nextStatus = "brevo-synced";
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "FAILED",
        syncError: error instanceof Error ? error.message : "Brevo sync failed."
      }
    });
  }

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/${id}`);
  redirect(buildEmailMarketingRedirect(nextStatus, id, redirectTo));
}

export async function sendEmailCampaignTestAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
  const explicitTestEmail = toPlainString(formData.get("testEmail"));

  if (!id) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const [campaign, settingsMap] = await Promise.all([
    prisma.emailCampaign.findUnique({
      where: { id }
    }),
    loadStoreSettingsMap()
  ]);

  if (!campaign) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const brevoSettings = getBrevoSettings(settingsMap);
  const testEmail = explicitTestEmail || brevoSettings.testEmail;

  if (!testEmail) {
    redirect(buildEmailMarketingRedirect("missing-test-email", id, redirectTo));
  }

  let nextStatus = "brevo-error";

  try {
    const pushResult = await pushCampaignToBrevo({
      settings: brevoSettings,
      campaign: mapEmailCampaignRecord(campaign)
    });

    await sendBrevoCampaignTest({
      settings: brevoSettings,
      brevoCampaignId: pushResult.brevoCampaignId,
      email: testEmail
    });

    await prisma.emailCampaign.update({
      where: { id },
      data: {
        brevoCampaignId: pushResult.brevoCampaignId,
        lastSyncedAt: new Date(),
        lastTestedAt: new Date(),
        status: campaign.scheduledAt ? "SCHEDULED" : "SYNCED",
        syncError: null
      }
    });
    nextStatus = "test-sent";
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "FAILED",
        syncError: error instanceof Error ? error.message : "Brevo test send failed."
      }
    });
  }

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/${id}`);
  redirect(buildEmailMarketingRedirect(nextStatus, id, redirectTo));
}

export async function sendEmailCampaignNowAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = toPlainString(formData.get("redirectTo"));

  if (!id) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const [campaign, settingsMap] = await Promise.all([
    prisma.emailCampaign.findUnique({
      where: { id }
    }),
    loadStoreSettingsMap()
  ]);

  if (!campaign) {
    redirect(buildEmailMarketingRedirect("missing-campaign", undefined, redirectTo));
  }

  const brevoSettings = getBrevoSettings(settingsMap);

  let nextStatus = "brevo-error";

  try {
    const pushResult = await pushCampaignToBrevo({
      settings: brevoSettings,
      campaign: mapEmailCampaignRecord(campaign)
    });

    await sendBrevoCampaignNow({
      settings: brevoSettings,
      brevoCampaignId: pushResult.brevoCampaignId
    });

    await prisma.emailCampaign.update({
      where: { id },
      data: {
        brevoCampaignId: pushResult.brevoCampaignId,
        lastSyncedAt: new Date(),
        lastSentAt: new Date(),
        status: "SENT",
        syncError: null
      }
    });
    nextStatus = "campaign-sent";
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "FAILED",
        syncError: error instanceof Error ? error.message : "Brevo send failed."
      }
    });
  }

  revalidatePath("/admin/email-marketing");
  revalidatePath(`/admin/email-marketing/${id}`);
  redirect(buildEmailMarketingRedirect(nextStatus, id, redirectTo));
}
