"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { generateEmailCampaignDraftWithAi } from "@/lib/openai-email";
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

function buildEmailAudienceRedirect(status: string, audienceType: EmailAudienceType, redirectTo?: string) {
  const fallbackPath = `/admin/email-marketing/audience/${audienceType}`;
  const basePath = redirectTo || fallbackPath;
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

  await prisma.post.create({
    data: {
      title: toPlainString(formData.get("title")),
      slug: toPlainString(formData.get("slug")),
      excerpt: toPlainString(formData.get("excerpt")),
      category: toPlainString(formData.get("category")),
      readTime: toInt(formData.get("readTime"), 4),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")),
      content: toPlainString(formData.get("content")),
      seoTitle: toPlainString(formData.get("seoTitle")),
      seoDescription: toPlainString(formData.get("seoDescription")),
      published,
      publishedAt: buildPublishedDate(formData, published)
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts?status=created");
}

export async function updatePostAction(formData: FormData) {
  await requireAdminSession();

  const published = toBool(formData.get("published"));
  const id = toPlainString(formData.get("id"));

  await prisma.post.update({
    where: { id },
    data: {
      title: toPlainString(formData.get("title")),
      slug: toPlainString(formData.get("slug")),
      excerpt: toPlainString(formData.get("excerpt")),
      category: toPlainString(formData.get("category")),
      readTime: toInt(formData.get("readTime"), 4),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")),
      content: toPlainString(formData.get("content")),
      seoTitle: toPlainString(formData.get("seoTitle")),
      seoDescription: toPlainString(formData.get("seoDescription")),
      published,
      publishedAt: buildPublishedDate(formData, published)
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts?status=updated");
}

export async function deletePostAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  await prisma.post.delete({ where: { id } });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts?status=deleted");
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
  const points = toInt(formData.get("points"));
  const note = toPlainString(formData.get("note")) || "Manual loyalty adjustment";

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: {
          increment: points
        }
      }
    }),
    prisma.rewardEntry.create({
      data: {
        customerId,
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

export async function bulkDeleteReviewsAction(formData: FormData) {
  await requireAdminSession();

  const productSlug = toPlainString(formData.get("productSlug"));
  const redirectTo = toPlainString(formData.get("redirectTo"));
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

  await prisma.productReview.deleteMany({
    where: {
      id: {
        in: reviewIds
      }
    }
  });

  revalidatePath("/admin/reviews");
  if (productSlug) {
    revalidatePath(`/admin/reviews/${productSlug}`);
  }
  refreshStorefront(productSlug ? [productSlug] : []);
  redirect(buildReviewRedirect("bulk-deleted", redirectTo, productSlug));
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
        verifiedPurchase: parseCsvBoolean(
          verifiedPurchaseIndex !== undefined ? row[verifiedPurchaseIndex] : undefined
        ),
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
    ["contact_recipient", toPlainString(formData.get("contact_recipient"))]
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

    revalidatePath("/admin/email-marketing");
    redirect(
      buildEmailMarketingRedirect(
        result.failed > 0
          ? result.uniqueImported > 0
            ? "audience-import-partial"
            : "audience-import-failed"
          : result.uniqueImported > 0
            ? "audience-import-complete"
            : "audience-import-empty",
        undefined,
        redirectTo
      )
    );
  } catch (error) {
    console.error("Brevo audience import failed:", error);
    redirect(buildEmailMarketingRedirect("audience-import-failed", undefined, redirectTo));
  }
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

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/audience/${audienceType}`);
    redirect(buildEmailAudienceRedirect("contact-removed", audienceType, redirectTo));
  } catch (error) {
    console.error("Brevo audience contact removal failed:", error);
    redirect(buildEmailAudienceRedirect("remove-failed", audienceType, redirectTo));
  }
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

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("ai-generated", id, redirectTo));
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        syncError: error instanceof Error ? error.message : "AI generation failed."
      }
    });

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("ai-error", id, redirectTo));
  }
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

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("brevo-synced", id, redirectTo));
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "FAILED",
        syncError: error instanceof Error ? error.message : "Brevo sync failed."
      }
    });

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("brevo-error", id, redirectTo));
  }
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

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("test-sent", id, redirectTo));
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "FAILED",
        syncError: error instanceof Error ? error.message : "Brevo test send failed."
      }
    });

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("brevo-error", id, redirectTo));
  }
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

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("campaign-sent", id, redirectTo));
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "FAILED",
        syncError: error instanceof Error ? error.message : "Brevo send failed."
      }
    });

    revalidatePath("/admin/email-marketing");
    revalidatePath(`/admin/email-marketing/${id}`);
    redirect(buildEmailMarketingRedirect("brevo-error", id, redirectTo));
  }
}
