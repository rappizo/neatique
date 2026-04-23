import { Prisma } from "@prisma/client";
import type {
  AiPostAutomationOverviewRecord,
  AdminEmailAudiencePageRecord,
  AdminOrderPageRecord,
  AdminOmbClaimPageRecord,
  AdminProductReviewPageRecord,
  AdminReviewProductSummary,
  AdminFormSubmissionPageRecord,
  BeautyPostRecord,
  BrevoCampaignReportRecord,
  BrevoListRecord,
  ComicAdminOverviewRecord,
  ComicChapterDetailRecord,
  ComicChapterRecord,
  ComicCharacterRecord,
  ComicEpisodeAssetRecord,
  ComicEpisodeDetailRecord,
  ComicEpisodeRecord,
  ComicProjectRecord,
  ComicPromptRunRecord,
  ComicPromptStudioPageRecord,
  ComicPublicChapterRecord,
  ComicPublicEpisodeRecord,
  ComicPublicSeasonRecord,
  ComicSceneRecord,
  ComicSeasonDetailRecord,
  ComicSeasonRecord,
  CouponRecord,
  CustomerAccountRecord,
  CustomerRecord,
  DashboardSummary,
  EmailContactRecord,
  EmailAudienceType,
  EmailCampaignRecord,
  EmailCampaignOverviewCardRecord,
  EmailCampaignSummaryReportRecord,
  EmailMarketingOverviewRecord,
  FollowEmailLogRecord,
  FollowEmailOverviewRecord,
  FollowEmailProcessKey,
  FormSubmissionRecord,
  FormSubmissionSummaryRecord,
  MascotRedemptionRecord,
  MascotRewardRecord,
  OmbClaimRecord,
  OrderRecord,
  ProductRecord,
  ProductReviewRecord,
  RewardEntryRecord,
  OrderActivityLogRecord,
  RyoClaimRecord,
  StoreSettingsRecord
} from "@/lib/types";
import { unstable_cache } from "next/cache";
import {
  EMAIL_AUDIENCE_OPTIONS,
  fetchBrevoCampaignReports,
  fetchBrevoLists,
  getBrevoSettings
} from "@/lib/brevo";
import { STORE_SETTINGS_CACHE_TAG } from "@/lib/cache-tags";
import { expireCouponsIfNeeded } from "@/lib/coupon-expiration";
import { parseStoredCouponProductCodes } from "@/lib/coupons";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { prisma } from "@/lib/db";
import { getOpenAiEmailSettings } from "@/lib/openai-email";
import { getAiPostAutomationOverview as loadAiPostAutomationOverview } from "@/lib/ai-post-automation";
import { getOpenAiPostSettings } from "@/lib/openai-posts";
import { getFollowEmailOverview as buildFollowEmailOverview } from "@/lib/follow-emails";
import { getDateKeyInTimeZone, LOS_ANGELES_TIME_ZONE } from "@/lib/format";
import {
  ensureLegacyContactFormBackfill,
  FORM_DEFINITIONS,
  getFormDefinition
} from "@/lib/form-submissions";
import { getDefaultMascotRewards } from "@/lib/mascot-program";
import {
  fallbackCustomers,
  fallbackDashboardSummary,
  fallbackOrders,
  fallbackPosts,
  fallbackProducts,
  fallbackReviews,
  fallbackRewards,
  fallbackSettings
} from "@/lib/fallback-data";

const PUBLIC_CONTENT_REVALIDATE_SECONDS = 60;
const OMB_UNSUBMITTED_PRODUCT_FILTER = "__NOT_SUBMITTED__";

function parseGalleryImages(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTransientDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2024" || error.code === "P1001";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Timed out fetching a new connection from the connection pool") ||
    message.includes("Can't reach database server")
  );
}

async function withFallback<T>(
  run: () => Promise<T>,
  fallback: T,
  options?: {
    allowFallbackOnDatabaseError?: boolean;
  }
): Promise<T> {
  if (!hasValidPostgresDatabaseUrl()) {
    return fallback;
  }

  try {
    return await run();
  } catch (error) {
    if (options?.allowFallbackOnDatabaseError && isTransientDatabaseError(error)) {
      console.error("Using fallback data after a transient database error:", error);
      return fallback;
    }

    throw error;
  }
}

function isMissingComicTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2021") {
    return false;
  }

  const tableName = typeof error.meta?.table === "string" ? error.meta.table : "";
  const message = error.message || "";
  const comicTablePattern =
    /Comic(Project|Character|Scene|Season|Chapter|Episode|EpisodeAsset|PromptRun)/;

  return comicTablePattern.test(tableName) || comicTablePattern.test(message);
}

async function withComicFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasValidPostgresDatabaseUrl()) {
    return fallback;
  }

  try {
    return await run();
  } catch (error) {
    if (isMissingComicTableError(error)) {
      console.warn("Comic tables are not available yet. Returning a safe empty state instead.");
      return fallback;
    }

    throw error;
  }
}

function mapProductRecord(product: any, reviewCount: number, averageRating: number | null): ProductRecord {
  return {
    id: product.id,
    productCode: product.productCode ?? "",
    productShortName: product.productShortName ?? null,
    amazonAsin: product.amazonAsin ?? null,
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    category: product.category,
    shortDescription: product.shortDescription,
    description: product.description,
    details: product.details,
    imageUrl: product.imageUrl,
    galleryImages: parseGalleryImages(product.galleryImages),
    featured: product.featured,
    status: product.status,
    inventory: product.inventory,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents ?? null,
    currency: product.currency,
    pointsReward: product.pointsReward,
    stripePriceId: product.stripePriceId ?? null,
    reviewCount,
    averageRating,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt)
  };
}

function buildReviewStatusSummary<T extends { productId: string; status: string }>(
  reviews: T[]
) {
  const summary = new Map<
    string,
    {
      totalReviewCount: number;
      publishedReviewCount: number;
      pendingReviewCount: number;
      hiddenReviewCount: number;
    }
  >();

  for (const review of reviews) {
    const bucket =
      summary.get(review.productId) ??
      {
        totalReviewCount: 0,
        publishedReviewCount: 0,
        pendingReviewCount: 0,
        hiddenReviewCount: 0
      };

    bucket.totalReviewCount += 1;

    if (review.status === "PUBLISHED") {
      bucket.publishedReviewCount += 1;
    }

    if (review.status === "PENDING") {
      bucket.pendingReviewCount += 1;
    }

    if (review.status === "HIDDEN") {
      bucket.hiddenReviewCount += 1;
    }

    summary.set(review.productId, bucket);
  }

  return summary;
}

function mapProduct(product: any): ProductRecord {
  const publishedReviews = Array.isArray(product.reviews)
    ? product.reviews.filter((review: any) => review.status === "PUBLISHED")
    : [];
  const reviewCount = publishedReviews.length;
  const averageRating =
    reviewCount > 0
      ? publishedReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount
      : null;

  return mapProductRecord(product, reviewCount, averageRating);
}

function parseStoredSecondaryKeywords(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStoredExternalLinks(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is { label: string; url: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.label === "string" &&
        typeof item.url === "string"
    );
  } catch {
    return [];
  }
}

function mapPost(post: any): BeautyPostRecord {
  const previewImageGeneratedAt = post.previewImageGeneratedAt
    ? new Date(post.previewImageGeneratedAt)
    : null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    readTime: post.readTime,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt ?? null,
    previewImageUrl: previewImageGeneratedAt ? `/media/post/${post.id}?preview=1&v=${previewImageGeneratedAt.getTime()}` : null,
    previewImageGeneratedAt,
    previewImagePrompt: post.previewImagePrompt ?? null,
    content: post.content,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    aiGenerated: Boolean(post.aiGenerated),
    focusKeyword: post.focusKeyword ?? null,
    secondaryKeywords: parseStoredSecondaryKeywords(post.secondaryKeywords),
    imagePrompt: post.imagePrompt ?? null,
    externalLinks: parseStoredExternalLinks(post.externalLinks),
    generatedAt: post.generatedAt ? new Date(post.generatedAt) : null,
    sourceProductId: post.sourceProductId ?? null,
    sourceProductName: post.sourceProduct?.name ?? null,
    sourceProductSlug: post.sourceProduct?.slug ?? null,
    published: post.published,
    publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt)
  };
}

const postSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  category: true,
  readTime: true,
  coverImageUrl: true,
  coverImageAlt: true,
  content: true,
  previewImageGeneratedAt: true,
  previewImagePrompt: true,
  seoTitle: true,
  seoDescription: true,
  aiGenerated: true,
  focusKeyword: true,
  secondaryKeywords: true,
  imagePrompt: true,
  externalLinks: true,
  generatedAt: true,
  sourceProductId: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  sourceProduct: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  }
} as const;

function mapCustomer(customer: any): CustomerRecord {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName ?? null,
    lastName: customer.lastName ?? null,
    hasPassword: Boolean(customer.passwordHash),
    passwordSetAt: customer.passwordSetAt ? new Date(customer.passwordSetAt) : null,
    lastLoginAt: customer.lastLoginAt ? new Date(customer.lastLoginAt) : null,
    marketingOptIn: customer.marketingOptIn,
    loyaltyPoints: customer.loyaltyPoints,
    totalSpentCents: customer.totalSpentCents,
    orderCount: customer._count?.orders,
    reviewCount: customer._count?.reviews,
    createdAt: new Date(customer.createdAt),
    updatedAt: new Date(customer.updatedAt)
  };
}

function mapEmailContact(contact: any): EmailContactRecord {
  return {
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName ?? null,
    lastName: contact.lastName ?? null,
    audienceType: contact.audienceType,
    source: contact.source,
    brevoContactId: contact.brevoContactId ?? null,
    brevoListId: contact.brevoListId ?? null,
    listName: contact.listName ?? null,
    emailBlacklisted: contact.emailBlacklisted,
    metadata: contact.metadata ?? null,
    lastSyncedAt: new Date(contact.lastSyncedAt),
    createdAt: new Date(contact.createdAt),
    updatedAt: new Date(contact.updatedAt)
  };
}

async function loadEmailContactLookup(emails: string[], audienceType: EmailAudienceType) {
  const normalizedEmails = Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (normalizedEmails.length === 0) {
    return new Map<string, EmailContactRecord>();
  }

  const contacts = await prisma.emailContact.findMany({
    where: {
      audienceType,
      email: {
        in: normalizedEmails
      }
    }
  });

  return new Map(contacts.map((contact) => [contact.email.trim().toLowerCase(), mapEmailContact(contact)]));
}

function mapOrder(order: any): OrderRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents ?? 0,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    pointsEarned: order.pointsEarned,
    couponCode: order.couponCode ?? null,
    couponId: order.couponId ?? null,
    shippingName: order.shippingName ?? null,
    shippingAddress1: order.shippingAddress1 ?? null,
    shippingAddress2: order.shippingAddress2 ?? null,
    shippingCity: order.shippingCity ?? null,
    shippingState: order.shippingState ?? null,
    shippingPostalCode: order.shippingPostalCode ?? null,
    shippingCountry: order.shippingCountry ?? null,
    billingName: order.billingName ?? null,
    billingAddress1: order.billingAddress1 ?? null,
    billingAddress2: order.billingAddress2 ?? null,
    billingCity: order.billingCity ?? null,
    billingState: order.billingState ?? null,
    billingPostalCode: order.billingPostalCode ?? null,
    billingCountry: order.billingCountry ?? null,
    notes: order.notes ?? null,
    stripeCheckoutId: order.stripeCheckoutId ?? null,
    stripePaymentIntentId: order.stripePaymentIntentId ?? null,
    customerId: order.customerId ?? null,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    items: (order.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      imageUrl: item.imageUrl
    })),
    activityLogs: (order.activityLogs ?? []).map((log: any): OrderActivityLogRecord => ({
      id: log.id,
      eventType: log.eventType,
      summary: log.summary,
      detail: log.detail ?? null,
      createdAt: new Date(log.createdAt)
    }))
  };
}

function mapCoupon(coupon: any): CouponRecord {
  const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
  const expired = Boolean(expiresAt && expiresAt.getTime() <= Date.now());

  return {
    id: coupon.id,
    code: coupon.code,
    content: coupon.content,
    active: coupon.active && !expired,
    expired,
    combinable: coupon.combinable,
    appliesToAll: coupon.appliesToAll,
    productCodes: parseStoredCouponProductCodes(coupon.productCodes),
    discountType: coupon.discountType,
    percentOff: coupon.percentOff ?? null,
    amountOffCents: coupon.amountOffCents ?? null,
    usageMode: coupon.usageMode,
    usageCount: coupon.usageCount,
    expiresAt,
    orderCount: coupon._count?.orders,
    createdAt: new Date(coupon.createdAt),
    updatedAt: new Date(coupon.updatedAt)
  };
}

function mapReward(reward: any): RewardEntryRecord {
  return {
    id: reward.id,
    type: reward.type,
    points: reward.points,
    note: reward.note ?? null,
    orderId: reward.orderId ?? null,
    customerId: reward.customerId,
    customerEmail: reward.customer?.email ?? "Unknown customer",
    createdAt: new Date(reward.createdAt)
  };
}

function mapMascotReward(mascot: any): MascotRewardRecord {
  return {
    id: mascot.id,
    sku: mascot.sku,
    name: mascot.name,
    slug: mascot.slug,
    description: mascot.description ?? null,
    imageUrl: mascot.imageUrl,
    pointsCost: mascot.pointsCost,
    active: mascot.active,
    sortOrder: mascot.sortOrder,
    redemptionCount: mascot._count?.redemptions,
    createdAt: new Date(mascot.createdAt),
    updatedAt: new Date(mascot.updatedAt)
  };
}

function mapMascotRedemption(redemption: any): MascotRedemptionRecord {
  return {
    id: redemption.id,
    pointsSpent: redemption.pointsSpent,
    status: redemption.status,
    email: redemption.email,
    fullName: redemption.fullName,
    address1: redemption.address1,
    address2: redemption.address2 ?? null,
    city: redemption.city,
    state: redemption.state,
    postalCode: redemption.postalCode,
    country: redemption.country,
    adminNote: redemption.adminNote ?? null,
    fulfilledAt: redemption.fulfilledAt ? new Date(redemption.fulfilledAt) : null,
    customerId: redemption.customerId,
    customerEmail: redemption.customer?.email ?? redemption.email,
    mascotId: redemption.mascotId,
    mascotName: redemption.mascot?.name ?? "Mascot",
    mascotSku: redemption.mascot?.sku ?? "",
    mascotImageUrl: redemption.mascot?.imageUrl ?? "",
    createdAt: new Date(redemption.createdAt),
    updatedAt: new Date(redemption.updatedAt)
  };
}

function mapReview(review: any): ProductReviewRecord {
  const reviewDateSource = review.reviewDate ?? review.publishedAt ?? review.createdAt;

  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    content: review.content,
    displayName: review.displayName,
    reviewDate: new Date(reviewDateSource),
    status: review.status,
    verifiedPurchase: review.verifiedPurchase,
    adminNotes: review.adminNotes ?? null,
    source: review.source,
    productId: review.productId,
    productName: review.product?.name,
    productSlug: review.product?.slug,
    customerId: review.customerId ?? null,
    customerEmail: review.customer?.email ?? null,
    orderId: review.orderId ?? null,
    publishedAt: review.publishedAt ? new Date(review.publishedAt) : null,
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.updatedAt)
  };
}

function mapFormSubmission(submission: any): FormSubmissionRecord {
  return {
    id: submission.id,
    formKey: submission.formKey,
    formLabel: submission.formLabel,
    email: submission.email,
    name: submission.name ?? null,
    subject: submission.subject ?? null,
    summary: submission.summary ?? null,
    message: submission.message ?? null,
    payload: submission.payload ?? null,
    handled: submission.handled,
    handledAt: submission.handledAt ? new Date(submission.handledAt) : null,
    legacyContactSubmissionId: submission.legacyContactSubmissionId ?? null,
    brevoContact: submission.brevoContact ? mapEmailContact(submission.brevoContact) : null,
    createdAt: new Date(submission.createdAt),
    updatedAt: new Date(submission.updatedAt)
  };
}

function mapFollowEmailLog(log: any): FollowEmailLogRecord {
  return {
    id: log.id,
    processKey: log.processKey,
    stageKey: log.stageKey,
    recipientEmail: log.recipientEmail,
    recipientName: log.recipientName ?? null,
    subject: log.subject,
    bodyText: log.bodyText,
    createdAt: new Date(log.createdAt)
  };
}

function mapOmbClaim(claim: any): OmbClaimRecord {
  return {
    id: claim.id,
    platformKey: claim.platformKey,
    platformLabel: claim.platformLabel,
    orderId: claim.orderId,
    name: claim.name,
    email: claim.email,
    phone: claim.phone ?? null,
    purchasedProduct: claim.purchasedProduct ?? null,
    reviewRating: claim.reviewRating ?? null,
    commentText: claim.commentText ?? null,
    reviewDestinationUrl: claim.reviewDestinationUrl ?? null,
    screenshotName: claim.screenshotName ?? null,
    screenshotMimeType: claim.screenshotMimeType ?? null,
    screenshotBytes: claim.screenshotBytes ?? null,
    extraBottleAddress: claim.extraBottleAddress ?? null,
    giftSent: claim.giftSent,
    giftSentAt: claim.giftSentAt ? new Date(claim.giftSentAt) : null,
    adminNote: claim.adminNote ?? null,
    completedAt: claim.completedAt ? new Date(claim.completedAt) : null,
    brevoContact: claim.brevoContact ? mapEmailContact(claim.brevoContact) : null,
    followEmails: Array.isArray(claim.followEmails) ? claim.followEmails.map(mapFollowEmailLog) : [],
    createdAt: new Date(claim.createdAt),
    updatedAt: new Date(claim.updatedAt)
  };
}

function mapRyoClaim(claim: any): RyoClaimRecord {
  return {
    id: claim.id,
    platformKey: claim.platformKey,
    platformLabel: claim.platformLabel,
    orderId: claim.orderId,
    name: claim.name,
    email: claim.email,
    phone: claim.phone ?? null,
    purchasedProduct: claim.purchasedProduct ?? null,
    reviewRating: claim.reviewRating ?? null,
    commentText: claim.commentText ?? null,
    reviewDestinationUrl: claim.reviewDestinationUrl ?? null,
    screenshotName: claim.screenshotName ?? null,
    screenshotMimeType: claim.screenshotMimeType ?? null,
    screenshotBytes: claim.screenshotBytes ?? null,
    customerId: claim.customerId ?? null,
    pointsAwarded: claim.pointsAwarded,
    rewardGranted: claim.rewardGranted,
    rewardGrantedAt: claim.rewardGrantedAt ? new Date(claim.rewardGrantedAt) : null,
    adminNote: claim.adminNote ?? null,
    completedAt: claim.completedAt ? new Date(claim.completedAt) : null,
    brevoContact: claim.brevoContact ? mapEmailContact(claim.brevoContact) : null,
    followEmails: Array.isArray(claim.followEmails) ? claim.followEmails.map(mapFollowEmailLog) : [],
    createdAt: new Date(claim.createdAt),
    updatedAt: new Date(claim.updatedAt)
  };
}

function mapEmailCampaign(campaign: any): EmailCampaignRecord {
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
    scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : null,
    status: campaign.status,
    brevoCampaignId: campaign.brevoCampaignId ?? null,
    lastSyncedAt: campaign.lastSyncedAt ? new Date(campaign.lastSyncedAt) : null,
    lastTestedAt: campaign.lastTestedAt ? new Date(campaign.lastTestedAt) : null,
    lastSentAt: campaign.lastSentAt ? new Date(campaign.lastSentAt) : null,
    syncError: campaign.syncError ?? null,
    createdAt: new Date(campaign.createdAt),
    updatedAt: new Date(campaign.updatedAt)
  };
}

function mapEmailCampaignOverviewCard(campaign: any): Omit<EmailCampaignOverviewCardRecord, "brevoReport"> {
  return {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    audienceType: campaign.audienceType,
    status: campaign.status,
    brevoCampaignId: campaign.brevoCampaignId ?? null,
    lastSyncedAt: campaign.lastSyncedAt ? new Date(campaign.lastSyncedAt) : null,
    scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : null,
    updatedAt: new Date(campaign.updatedAt),
    createdAt: new Date(campaign.createdAt)
  };
}

function buildCampaignSummaryReport(reports: Array<BrevoCampaignReportRecord | null | undefined>) {
  const activeReports = reports.filter((report): report is BrevoCampaignReportRecord => Boolean(report));
  const sentReports = activeReports.filter((report) => (report.stats?.sent ?? 0) > 0);
  const totalSent = sentReports.reduce((sum, report) => sum + (report.stats?.sent ?? 0), 0);
  const totalDelivered = sentReports.reduce((sum, report) => sum + (report.stats?.delivered ?? 0), 0);
  const totalUniqueViews = sentReports.reduce((sum, report) => sum + (report.stats?.uniqueViews ?? 0), 0);
  const totalUniqueClicks = sentReports.reduce((sum, report) => sum + (report.stats?.uniqueClicks ?? 0), 0);
  const totalUnsubscriptions = sentReports.reduce(
    (sum, report) => sum + (report.stats?.unsubscriptions ?? 0),
    0
  );

  return {
    trackedCampaignCount: activeReports.length,
    sentCampaignCount: sentReports.length,
    totalSent,
    totalDelivered,
    totalUniqueViews,
    totalUniqueClicks,
    totalUnsubscriptions,
    overallOpenRate: totalDelivered > 0 ? totalUniqueViews / totalDelivered : null,
    overallClickRate: totalDelivered > 0 ? totalUniqueClicks / totalDelivered : null
  } satisfies EmailCampaignSummaryReportRecord;
}

const getFeaturedProductsFromDatabase = unstable_cache(
  async (limit: number) =>
    (
      await prisma.product.findMany({
        where: {
          featured: true,
          status: "ACTIVE"
        },
        include: {
          reviews: true
        },
        orderBy: [{ createdAt: "desc" }],
        take: limit
      })
    ).map(mapProduct),
  ["featured-products"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getActiveProductsFromDatabase = unstable_cache(
  async () =>
    (
      await prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: {
          reviews: true
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
      })
    ).map(mapProduct),
  ["active-products"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getProductBySlugFromDatabase = unstable_cache(
  async (slug: string) => {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        reviews: true
      }
    });

    return product ? mapProduct(product) : null;
  },
  ["product-by-slug"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getPublishedPostsFromDatabase = unstable_cache(
  async (limit?: number) =>
    (
      await prisma.post.findMany({
        select: postSelect,
        where: { published: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: limit
      })
    ).map(mapPost),
  ["published-posts"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getPostBySlugFromDatabase = unstable_cache(
  async (slug: string) => {
    const post = await prisma.post.findUnique({
      where: { slug },
      select: postSelect
    });

    return post ? mapPost(post) : null;
  },
  ["post-by-slug"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

export async function getFeaturedProducts(limit = 4) {
  return withFallback(
    async () => getFeaturedProductsFromDatabase(limit),
    [],
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getProducts() {
  return withFallback(
    async () =>
      (
        await prisma.product.findMany({
          include: {
            reviews: true
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapProduct),
    fallbackProducts
  );
}

export async function getActiveProducts() {
  return withFallback(
    async () => getActiveProductsFromDatabase(),
    [],
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getProductBySlug(slug: string) {
  return withFallback(
    async () => getProductBySlugFromDatabase(slug),
    null,
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getProductById(id: string) {
  return withFallback(
    async () => {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          reviews: true
        }
      });

      return product ? mapProduct(product) : null;
    },
    fallbackProducts.find((product) => product.id === id) ?? null
  );
}

export async function getOmbSelectableProducts() {
  return withFallback(
    async () =>
      (
        await prisma.product.findMany({
          where: {
            productShortName: {
              not: null
            }
          },
          orderBy: [{ createdAt: "asc" }]
        })
      )
        .map(mapProduct)
        .filter((product) => Boolean(product.productShortName)),
    fallbackProducts.filter((product) => Boolean(product.productShortName))
  );
}

export async function getPublishedPosts(limit?: number) {
  return withFallback(
    async () => getPublishedPostsFromDatabase(limit),
    typeof limit === "number"
      ? fallbackPosts.filter((post) => post.published).slice(0, limit)
      : fallbackPosts.filter((post) => post.published),
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getAllPosts() {
  return withFallback(
    async () =>
      (
        await prisma.post.findMany({
          select: postSelect,
          orderBy: [{ createdAt: "desc" }]
        })
      ).map(mapPost),
    [...fallbackPosts].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
  );
}

export async function getPostById(id: string) {
  return withFallback(
    async () => {
      const post = await prisma.post.findUnique({
        where: { id },
        select: postSelect
      });

      return post ? mapPost(post) : null;
    },
    fallbackPosts.find((post) => post.id === id) ?? null
  );
}

export async function getAiPostAutomationOverview() {
  return withFallback<AiPostAutomationOverviewRecord>(
    async () => loadAiPostAutomationOverview(),
    {
      enabled: false,
      cadenceDays: 2,
      autoPublish: false,
      includeExternalLinks: true,
      lastRunAt: null,
      lastStatus: null,
      lastPostId: null,
      lastPostTitle: null,
      rotationCursor: null,
      nextProductId: null,
      nextProductName: null,
      nextProductCode: null,
      aiPostCount: 0,
      publishedAiPostCount: 0,
      draftAiPostCount: 0,
      model: getOpenAiPostSettings().model,
      imageModel: getOpenAiPostSettings().imageModel
    }
  );
}

export async function getPostBySlug(slug: string) {
  const staticFallbackPost = fallbackPosts.find((post) => post.slug === slug) ?? null;

  try {
    return await getPostBySlugFromDatabase(slug);
  } catch (error) {
    if (isTransientDatabaseError(error)) {
      try {
        const cachedPublishedPosts = await getPublishedPostsFromDatabase();
        const cachedPost = cachedPublishedPosts.find((post) => post.slug === slug) ?? null;

        if (cachedPost) {
          return cachedPost;
        }
      } catch {
        // Fall through to the static fallback below when the cached list is unavailable.
      }

      return staticFallbackPost;
    }

    throw error;
  }
}

export async function getCustomers() {
  return withFallback(
    async () =>
      (
        await prisma.customer.findMany({
          include: {
            _count: {
              select: {
                orders: true,
                reviews: true
              }
            }
          },
          orderBy: [{ totalSpentCents: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapCustomer),
    fallbackCustomers
  );
}

export async function getOrders(page = 1, pageSize = 50) {
  const fallbackTotalPages = Math.max(1, Math.ceil(fallbackOrders.length / pageSize));
  const fallbackCurrentPage = Math.min(Math.max(1, page), fallbackTotalPages);
  const fallback: AdminOrderPageRecord = {
    orders: fallbackOrders.slice((fallbackCurrentPage - 1) * pageSize, fallbackCurrentPage * pageSize),
    totalCount: fallbackOrders.length,
    currentPage: fallbackCurrentPage,
    totalPages: fallbackTotalPages,
    pageSize
  };

  return withFallback<AdminOrderPageRecord>(
    async () => {
      const totalCount = await prisma.order.count();
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);
        const rows = await prisma.order.findMany({
          include: {
            items: true,
            activityLogs: {
              orderBy: [{ createdAt: "desc" }],
              take: 8
            }
          },
          orderBy: [{ createdAt: "desc" }],
          skip: (currentPage - 1) * pageSize,
          take: pageSize
      });

      return {
        orders: rows.map(mapOrder),
        totalCount,
        currentPage,
        totalPages,
        pageSize
      };
    },
    fallback
  );
}

export async function getCoupons() {
  return withFallback(
    async () => {
      await expireCouponsIfNeeded();

      return (
        await prisma.coupon.findMany({
          include: {
            _count: {
              select: {
                orders: true
              }
            }
          },
          orderBy: [{ active: "desc" }, { updatedAt: "desc" }]
        })
      ).map(mapCoupon);
    },
    []
  );
}

export async function getCouponById(id: string) {
  return withFallback(
    async () => {
      await expireCouponsIfNeeded();

      const coupon = await prisma.coupon.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: true
            }
          }
        }
      });

      return coupon ? mapCoupon(coupon) : null;
    },
    null
  );
}

export async function getFormSubmissionSummaries() {
  return withFallback(
    async () => {
      await ensureLegacyContactFormBackfill();
      const groupedRows = await prisma.formSubmission.groupBy({
        by: ["formKey", "formLabel", "handled"],
        _count: { id: true },
        _max: { createdAt: true }
      });

      const summaryMap = new Map<string, FormSubmissionSummaryRecord>();

      for (const definition of FORM_DEFINITIONS) {
        summaryMap.set(definition.key, {
          formKey: definition.key,
          formLabel: definition.label,
          description: definition.description,
          totalCount: 0,
          unhandledCount: 0,
          latestSubmittedAt: null
        });
      }

      for (const row of groupedRows) {
        const definition = getFormDefinition(row.formKey);
        if (!definition) {
          continue;
        }
        const existing =
          summaryMap.get(row.formKey) ??
          ({
            formKey: row.formKey,
            formLabel: row.formLabel,
            description: definition?.description || "Form submissions captured on the storefront.",
            totalCount: 0,
            unhandledCount: 0,
            latestSubmittedAt: null
          } satisfies FormSubmissionSummaryRecord);

        existing.totalCount += row._count.id;

        if (!row.handled) {
          existing.unhandledCount += row._count.id;
        }

        if (!existing.latestSubmittedAt || (row._max.createdAt && row._max.createdAt > existing.latestSubmittedAt)) {
          existing.latestSubmittedAt = row._max.createdAt ? new Date(row._max.createdAt) : existing.latestSubmittedAt;
        }

        summaryMap.set(row.formKey, existing);
      }

      return Array.from(summaryMap.values()).sort((left, right) =>
        left.formLabel.localeCompare(right.formLabel)
      );
    },
    FORM_DEFINITIONS.map((definition) => ({
      formKey: definition.key,
      formLabel: definition.label,
      description: definition.description,
      totalCount: 0,
      unhandledCount: 0,
      latestSubmittedAt: null
    }))
  );
}

export async function getFormSubmissionPage(formKey: string, page = 1, pageSize = 50, searchEmail = "") {
  const definition = getFormDefinition(formKey);

  if (!definition) {
    return null;
  }

  const normalizedSearchEmail = searchEmail.trim().toLowerCase();

  return withFallback(
    async () => {
      await ensureLegacyContactFormBackfill();
      const where = {
        formKey,
        ...(normalizedSearchEmail
          ? {
              email: {
                contains: normalizedSearchEmail,
                mode: "insensitive" as const
              }
            }
          : {})
      };

      const [totalCount, unhandledCount] = await prisma.$transaction([
        prisma.formSubmission.count({ where }),
        prisma.formSubmission.count({
          where: {
            ...where,
            handled: false
          }
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const rows = await prisma.formSubmission.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: Math.max(0, currentPage - 1) * pageSize,
        take: pageSize
      });
      const brevoContactLookup =
        formKey === "contact"
          ? await loadEmailContactLookup(
              rows.map((row) => row.email),
              "LEADS"
            )
          : new Map<string, EmailContactRecord>();

      return {
        formKey: definition.key,
        formLabel: definition.label,
        description: definition.description,
        submissions: rows.map((row) =>
          mapFormSubmission({
            ...row,
            brevoContact: brevoContactLookup.get(row.email.trim().toLowerCase()) ?? null
          })
        ),
        totalCount,
        unhandledCount,
        currentPage,
        totalPages,
        pageSize,
        searchEmail: normalizedSearchEmail
      } satisfies AdminFormSubmissionPageRecord;
    },
    {
      formKey: definition.key,
      formLabel: definition.label,
      description: definition.description,
      submissions: [],
      totalCount: 0,
      unhandledCount: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize,
      searchEmail: normalizedSearchEmail
    } satisfies AdminFormSubmissionPageRecord
  );
}

export async function getFormSubmissionById(formKey: string, id: string) {
  const definition = getFormDefinition(formKey);

  if (!definition) {
    return null;
  }

  return withFallback(
    async () => {
      await ensureLegacyContactFormBackfill();
      const submission = await prisma.formSubmission.findFirst({
        where: {
          id,
          formKey
        }
      });

      if (!submission) {
        return null;
      }

      const brevoContactLookup =
        formKey === "contact"
          ? await loadEmailContactLookup([submission.email], "LEADS")
          : new Map<string, EmailContactRecord>();

      return mapFormSubmission({
        ...submission,
        brevoContact: brevoContactLookup.get(submission.email.trim().toLowerCase()) ?? null
      });
    },
    null
  );
}

export async function getOmbClaims(searchEmail = "") {
  const normalizedSearchEmail = searchEmail.trim().toLowerCase();

  return withFallback(
    async () =>
      (
        await prisma.ombClaim.findMany({
          where: normalizedSearchEmail
            ? {
                email: {
                  contains: normalizedSearchEmail,
                  mode: "insensitive"
                }
              }
            : undefined,
          include: {
            followEmails: {
              orderBy: [{ createdAt: "desc" }]
            }
          },
          orderBy: [{ createdAt: "desc" }]
        })
      ).map(mapOmbClaim),
    []
  );
}

export async function getOmbClaimPage(
  page = 1,
  pageSize = 50,
  searchEmail = "",
  searchPlatform = "",
  searchProduct = ""
) {
  const normalizedSearchEmail = searchEmail.trim().toLowerCase();
  const normalizedSearchPlatform = searchPlatform.trim().toLowerCase();
  const normalizedSearchProduct = searchProduct.trim();
  const fallback: AdminOmbClaimPageRecord = {
    claims: [],
    totalCount: 0,
    completedTodayCount: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize,
    searchEmail: normalizedSearchEmail,
    searchPlatform: normalizedSearchPlatform,
    searchProduct: normalizedSearchProduct,
    platformOptions: [],
    productOptions: []
  };

  return withFallback(
    async () => {
      const where = {
        ...(normalizedSearchEmail
          ? {
            email: {
              contains: normalizedSearchEmail,
              mode: "insensitive" as const
            }
          }
          : {}),
        ...(normalizedSearchPlatform
          ? {
              platformKey: normalizedSearchPlatform
            }
          : {}),
        ...(normalizedSearchProduct
          ? {
              ...(normalizedSearchProduct === OMB_UNSUBMITTED_PRODUCT_FILTER
                ? {
                    purchasedProduct: null
                  }
                : {
                    purchasedProduct: normalizedSearchProduct
                  })
            }
          : {})
      };

      const [totalCount, completedTodayRows, platformRows, productRows, productShortNames] = await prisma.$transaction([
        prisma.ombClaim.count({ where }),
        prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM "OmbClaim"
          WHERE "completedAt" IS NOT NULL
            AND ("completedAt" AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date =
                (CURRENT_TIMESTAMP AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date
        `,
        prisma.ombClaim.findMany({
          select: {
            platformKey: true,
            platformLabel: true
          },
          distinct: ["platformKey"],
          orderBy: [{ platformLabel: "asc" }]
        }),
        prisma.ombClaim.findMany({
          where: {
            purchasedProduct: {
              not: null
            }
          },
          select: {
            purchasedProduct: true
          },
          distinct: ["purchasedProduct"],
          orderBy: [{ purchasedProduct: "asc" }]
        }),
        prisma.product.findMany({
          where: {
            productShortName: {
              not: null
            }
          },
          select: {
            productShortName: true
          },
          distinct: ["productShortName"],
          orderBy: [{ productShortName: "asc" }]
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const pagedClaims = await prisma.ombClaim.findMany({
        where,
        include: {
          followEmails: {
            orderBy: [{ createdAt: "desc" }]
          }
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (currentPage - 1) * pageSize,
        take: pageSize
      });
      const brevoContactLookup = await loadEmailContactLookup(
        pagedClaims.map((claim) => claim.email),
        "CUSTOMERS"
      );
      const completedTodayCount = completedTodayRows[0]?.count ?? 0;

      const platformOptions = platformRows
        .filter((platform) => platform.platformKey && platform.platformLabel)
        .map((platform) => ({
          value: platform.platformKey,
          label: platform.platformLabel
        }));
      const productOptions = Array.from(
        new Set(
          [
            OMB_UNSUBMITTED_PRODUCT_FILTER,
            ...productRows.map((row) => row.purchasedProduct).filter((value): value is string => Boolean(value)),
            ...productShortNames
              .map((product) => product.productShortName)
              .filter((value): value is string => Boolean(value))
          ].sort((a, b) => a.localeCompare(b))
        )
      );

      return {
        claims: pagedClaims.map((claim) =>
          mapOmbClaim({
            ...claim,
            brevoContact: brevoContactLookup.get(claim.email.trim().toLowerCase()) ?? null
          })
        ),
        totalCount,
        completedTodayCount,
        currentPage,
        totalPages,
        pageSize,
        searchEmail: normalizedSearchEmail,
        searchPlatform: normalizedSearchPlatform,
        searchProduct: normalizedSearchProduct,
        platformOptions,
        productOptions
      } satisfies AdminOmbClaimPageRecord;
    },
    fallback
  );
}

export async function getOmbClaimById(id: string) {
  return withFallback(
    async () => {
      const claim = await prisma.ombClaim.findUnique({
        where: { id },
        include: {
          followEmails: {
            orderBy: [{ createdAt: "desc" }]
          }
        }
      });

      if (!claim) {
        return null;
      }

      const brevoContactLookup = await loadEmailContactLookup([claim.email], "CUSTOMERS");

      return mapOmbClaim({
        ...claim,
        brevoContact: brevoContactLookup.get(claim.email.trim().toLowerCase()) ?? null
      });
    },
    null
  );
}

export async function getRewards() {
  return withFallback(
    async () =>
      (
        await prisma.rewardEntry.findMany({
          include: {
            customer: true
          },
          orderBy: [{ createdAt: "desc" }]
        })
      ).map(mapReward),
    fallbackRewards
  );
}

export async function getMascotRewards() {
  const fallback = getDefaultMascotRewards();

  return withFallback(
    async () =>
      (
        await prisma.mascotReward.findMany({
          include: {
            _count: {
              select: {
                redemptions: true
              }
            }
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        })
      ).map(mapMascotReward),
    fallback
  );
}

export async function getActiveMascotRewards() {
  const fallback = getDefaultMascotRewards().filter((mascot) => mascot.active);

  return withFallback(
    async () =>
      (
        await prisma.mascotReward.findMany({
          where: {
            active: true
          },
          include: {
            _count: {
              select: {
                redemptions: true
              }
            }
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        })
      ).map(mapMascotReward),
    fallback
  );
}

export async function getMascotRewardById(id: string) {
  const fallback = getDefaultMascotRewards().find((mascot) => mascot.id === id) ?? null;

  return withFallback<MascotRewardRecord | null>(
    async () => {
      const mascot = await prisma.mascotReward.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              redemptions: true
            }
          }
        }
      });

      return mascot ? mapMascotReward(mascot) : null;
    },
    fallback
  );
}

export async function getMascotRewardBySlug(slug: string) {
  const fallback = getDefaultMascotRewards().find((mascot) => mascot.slug === slug) ?? null;

  return withFallback<MascotRewardRecord | null>(
    async () => {
      const mascot = await prisma.mascotReward.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              redemptions: true
            }
          }
        }
      });

      return mascot ? mapMascotReward(mascot) : null;
    },
    fallback
  );
}

export async function getMascotRedemptions(limit = 50) {
  return withFallback(
    async () =>
      (
        await prisma.mascotRedemption.findMany({
          include: {
            mascot: true,
            customer: true
          },
          orderBy: [{ createdAt: "desc" }],
          take: limit
        })
      ).map(mapMascotRedemption),
    [] as MascotRedemptionRecord[]
  );
}

export async function getRyoClaims(limit = 50) {
  return withFallback(
    async () => {
      const claims = await prisma.ryoClaim.findMany({
        include: {
          followEmails: {
            orderBy: [{ createdAt: "desc" }]
          }
        },
        orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
        take: limit
      });
      const brevoContactLookup = await loadEmailContactLookup(
        claims.map((claim) => claim.email),
        "CUSTOMERS"
      );

      return claims.map((claim) =>
        mapRyoClaim({
          ...claim,
          brevoContact: brevoContactLookup.get(claim.email.trim().toLowerCase()) ?? null
        })
      );
    },
    [] as RyoClaimRecord[]
  );
}

export async function getFollowEmailOverview(processKey: FollowEmailProcessKey) {
  return withFallback<FollowEmailOverviewRecord>(
    async () => {
      const [settings, rows] = await Promise.all([
        getStoreSettings(),
        prisma.$queryRaw<Array<{ stageKey: FollowEmailLogRecord["stageKey"]; count: number }>>`
          SELECT "stageKey", COUNT(*)::int AS count
          FROM "FollowEmailLog"
          WHERE "processKey" = ${processKey}::"FollowEmailProcess"
            AND ("createdAt" AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date =
                (CURRENT_TIMESTAMP AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date
          GROUP BY "stageKey"
        `
      ]);

      const sentCounts = rows.reduce<Partial<Record<FollowEmailLogRecord["stageKey"], number>>>(
        (accumulator, row) => {
          accumulator[row.stageKey] = row.count;
          return accumulator;
        },
        {}
      );

      return buildFollowEmailOverview(processKey, settings, sentCounts);
    },
    buildFollowEmailOverview(processKey, fallbackSettings, {})
  );
}

export async function getPublishedReviewsByProductId(productId: string) {
  return withFallback(
    async () =>
      (
        await prisma.productReview.findMany({
          where: {
            productId,
            status: "PUBLISHED"
          },
          include: {
            product: true,
            customer: true
          },
          orderBy: [{ reviewDate: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapReview),
    fallbackReviews
      .filter((review) => review.productId === productId && review.status === "PUBLISHED")
      .sort((left, right) => right.reviewDate.getTime() - left.reviewDate.getTime()),
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getPublishedReviewById(id: string) {
  return withFallback<ProductReviewRecord | null>(
    async () => {
      const review = await prisma.productReview.findFirst({
        where: {
          id,
          status: "PUBLISHED"
        },
        include: {
          product: true,
          customer: true
        }
      });

      return review ? mapReview(review) : null;
    },
    fallbackReviews.find((review) => review.id === id && review.status === "PUBLISHED") ?? null,
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getAllReviews() {
  return withFallback(
    async () =>
      (
        await prisma.productReview.findMany({
          include: {
            product: true,
            customer: true
          },
          orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapReview),
    [...fallbackReviews].sort((left, right) => right.reviewDate.getTime() - left.reviewDate.getTime())
  );
}

export async function getAdminReviewProducts() {
  const fallback = (() => {
    const statusSummary = buildReviewStatusSummary(fallbackReviews);

    return fallbackProducts.map<AdminReviewProductSummary>((product) => {
      const bucket = statusSummary.get(product.id);

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        category: product.category,
        status: product.status,
        shortDescription: product.shortDescription,
        averageRating: product.averageRating ?? null,
        totalReviewCount: bucket?.totalReviewCount ?? product.reviewCount ?? 0,
        publishedReviewCount: bucket?.publishedReviewCount ?? product.reviewCount ?? 0,
        pendingReviewCount: bucket?.pendingReviewCount ?? 0,
        hiddenReviewCount: bucket?.hiddenReviewCount ?? 0
      };
    });
  })();

  return withFallback(
    async () => {
      const [products, statusRows, publishedRows] = await prisma.$transaction([
        prisma.product.findMany({
          select: {
            id: true,
            productCode: true,
            name: true,
            slug: true,
            tagline: true,
            category: true,
            shortDescription: true,
            description: true,
            details: true,
            imageUrl: true,
            galleryImages: true,
            featured: true,
            status: true,
            inventory: true,
            priceCents: true,
            compareAtPriceCents: true,
            currency: true,
            pointsReward: true,
            stripePriceId: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
        }),
        prisma.productReview.groupBy({
          by: ["productId", "status"],
          orderBy: [{ productId: "asc" }, { status: "asc" }],
          _count: { id: true }
        }),
        prisma.productReview.groupBy({
          by: ["productId"],
          orderBy: { productId: "asc" },
          where: { status: "PUBLISHED" },
          _count: { id: true },
          _avg: { rating: true }
        })
      ]);

      const statusSummary = new Map<
        string,
        {
          totalReviewCount: number;
          publishedReviewCount: number;
          pendingReviewCount: number;
          hiddenReviewCount: number;
        }
      >();

      for (const row of statusRows) {
        const countValue = row._count as { id?: number } | undefined;
        const count = countValue?.id ?? 0;
        const bucket =
          statusSummary.get(row.productId) ??
          {
            totalReviewCount: 0,
            publishedReviewCount: 0,
            pendingReviewCount: 0,
            hiddenReviewCount: 0
          };

        bucket.totalReviewCount += count;

        if (row.status === "PUBLISHED") {
          bucket.publishedReviewCount = count;
        }

        if (row.status === "PENDING") {
          bucket.pendingReviewCount = count;
        }

        if (row.status === "HIDDEN") {
          bucket.hiddenReviewCount = count;
        }

        statusSummary.set(row.productId, bucket);
      }

      const publishedSummary = new Map(
        publishedRows.map((row) => [row.productId, row])
      );

      return products.map<AdminReviewProductSummary>((product) => {
        const bucket = statusSummary.get(product.id);
        const published = publishedSummary.get(product.id);

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          category: product.category,
          status: product.status,
          shortDescription: product.shortDescription,
          averageRating: published?._avg?.rating ?? null,
          totalReviewCount: bucket?.totalReviewCount ?? 0,
          publishedReviewCount: bucket?.publishedReviewCount ?? 0,
          pendingReviewCount: bucket?.pendingReviewCount ?? 0,
          hiddenReviewCount: bucket?.hiddenReviewCount ?? 0
        };
      });
    },
    fallback
  );
}

export async function getAdminReviewPageByProductSlug(slug: string, page = 1, pageSize = 50) {
  const fallback = (() => {
    const product = fallbackProducts.find((item) => item.slug === slug);

    if (!product) {
      return null;
    }

    const productReviews = fallbackReviews
      .filter((review) => review.productId === product.id)
      .sort((left, right) => right.reviewDate.getTime() - left.reviewDate.getTime());
    const counts = buildReviewStatusSummary(productReviews).get(product.id);
    const totalReviewCount = productReviews.length;
    const totalPages = Math.max(1, Math.ceil(totalReviewCount / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const reviews = productReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      product,
      reviews,
      totalReviewCount,
      publishedReviewCount: counts?.publishedReviewCount ?? product.reviewCount ?? 0,
      pendingReviewCount: counts?.pendingReviewCount ?? 0,
      hiddenReviewCount: counts?.hiddenReviewCount ?? 0,
      currentPage,
      totalPages,
      pageSize
    } satisfies AdminProductReviewPageRecord;
  })();

  return withFallback(
    async () => {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: {
          id: true,
          productCode: true,
          name: true,
          slug: true,
          tagline: true,
          category: true,
          shortDescription: true,
          description: true,
          details: true,
          imageUrl: true,
          galleryImages: true,
          featured: true,
          status: true,
          inventory: true,
          priceCents: true,
          compareAtPriceCents: true,
          currency: true,
          pointsReward: true,
          stripePriceId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!product) {
        return null;
      }

      const [statusRows, publishedAggregate, totalReviewCount] = await prisma.$transaction([
        prisma.productReview.groupBy({
          by: ["status"],
          orderBy: { status: "asc" },
          where: { productId: product.id },
          _count: { id: true }
        }),
        prisma.productReview.aggregate({
          where: {
            productId: product.id,
            status: "PUBLISHED"
          },
          _count: { id: true },
          _avg: { rating: true }
        }),
        prisma.productReview.count({
          where: { productId: product.id }
        })
      ]);

      let publishedReviewCount = 0;
      let pendingReviewCount = 0;
      let hiddenReviewCount = 0;

      for (const row of statusRows) {
        const countValue = row._count as { id?: number } | undefined;
        const count = countValue?.id ?? 0;
        if (row.status === "PUBLISHED") {
          publishedReviewCount = count;
        }

        if (row.status === "PENDING") {
          pendingReviewCount = count;
        }

        if (row.status === "HIDDEN") {
          hiddenReviewCount = count;
        }
      }

      const totalPages = Math.max(1, Math.ceil(totalReviewCount / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const reviews = (
        await prisma.productReview.findMany({
          where: { productId: product.id },
          include: {
            product: true,
            customer: true
          },
          orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
          skip: (currentPage - 1) * pageSize,
          take: pageSize
        })
      ).map(mapReview);

      return {
        product: mapProductRecord(product, publishedReviewCount, publishedAggregate._avg?.rating ?? null),
        reviews,
        totalReviewCount,
        publishedReviewCount,
        pendingReviewCount,
        hiddenReviewCount,
        currentPage,
        totalPages,
        pageSize
      } satisfies AdminProductReviewPageRecord;
    },
    fallback
  );
}

const loadStoreSettings = unstable_cache(
  async () => {
    const settings = await prisma.storeSetting.findMany({
      orderBy: { key: "asc" }
    });

    return settings.reduce<StoreSettingsRecord>((accumulator, setting) => {
      accumulator[setting.key] = setting.value;
      return accumulator;
    }, {});
  },
  ["store-settings"],
  {
    tags: [STORE_SETTINGS_CACHE_TAG]
  }
);

export async function getStoreSettings() {
  return withFallback(
    async () => loadStoreSettings(),
    fallbackSettings
  );
}

export async function getEmailCampaignById(id: string) {
  return withFallback<EmailCampaignRecord | null>(
    async () => {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id }
      });

      return campaign ? mapEmailCampaign(campaign) : null;
    },
    null
  );
}

export async function getEmailMarketingOverview() {
  return withFallback<EmailMarketingOverviewRecord>(
    async () => {
      const [settings, newsletterRows, leadRows, optedInCustomerRows, importedContacts, campaigns] = await Promise.all([
        getStoreSettings(),
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
          },
          distinct: ["email"]
        }),
        prisma.emailContact.findMany({
          where: {
            audienceType: {
              in: ["NEWSLETTER", "CUSTOMERS", "LEADS"]
            }
          },
          select: {
            email: true,
            audienceType: true
          }
        }),
        prisma.emailCampaign.findMany({
          select: {
            id: true,
            name: true,
            subject: true,
            audienceType: true,
            status: true,
            brevoCampaignId: true,
            lastSyncedAt: true,
            scheduledAt: true,
            updatedAt: true,
            createdAt: true
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
        })
      ]);

      const brevoSettings = getBrevoSettings(settings);
      const openAiSettings = getOpenAiEmailSettings();
      const [brevoListsResult, brevoReportsResult] = await Promise.all([
        fetchBrevoLists(brevoSettings),
        fetchBrevoCampaignReports(brevoSettings)
      ]);
      const brevoReportLookup = new Map(
        brevoReportsResult.reports.map((report) => [report.id, report] satisfies [number, BrevoCampaignReportRecord])
      );
      const campaignsMapped = campaigns.map((campaign) => {
        const mappedCampaign = mapEmailCampaignOverviewCard(campaign);
        return {
          ...mappedCampaign,
          brevoReport: mappedCampaign.brevoCampaignId
            ? brevoReportLookup.get(mappedCampaign.brevoCampaignId) ?? null
            : null
        } satisfies EmailCampaignOverviewCardRecord;
      });
      const brevoListLookup = new Map(brevoListsResult.lists.map((list) => [list.id, list]));
      const newsletterEmailSet = new Set(newsletterRows.map((row) => row.email));
      const leadEmailSet = new Set(leadRows.map((row) => row.email));
      const customerEmailSet = new Set(optedInCustomerRows.map((row) => row.email));
      const importedNewsletterSet = new Set(
        importedContacts.filter((contact) => contact.audienceType === "NEWSLETTER").map((contact) => contact.email)
      );
      const importedCustomerSet = new Set(
        importedContacts.filter((contact) => contact.audienceType === "CUSTOMERS").map((contact) => contact.email)
      );
      const importedLeadSet = new Set(
        importedContacts.filter((contact) => contact.audienceType === "LEADS").map((contact) => contact.email)
      );
      const newsletterCount = new Set([...newsletterEmailSet, ...importedNewsletterSet]).size;
      const leadCount = new Set([...leadEmailSet, ...importedLeadSet]).size;
      const optedInCustomerCount = new Set([...customerEmailSet, ...importedCustomerSet]).size;
      const importedContactCount = new Set(importedContacts.map((contact) => contact.email)).size;
      const campaignCount = campaignsMapped.length;
      const syncedCampaignCount = campaignsMapped.filter((campaign) => campaign.status === "SYNCED").length;
      const scheduledCampaignCount = campaignsMapped.filter((campaign) => campaign.status === "SCHEDULED").length;
      const sentCampaignCount = campaignsMapped.filter((campaign) => campaign.status === "SENT").length;
      const campaignReport = buildCampaignSummaryReport(campaignsMapped.map((campaign) => campaign.brevoReport));
      const audiences = EMAIL_AUDIENCE_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        description: option.description,
        localCount:
          option.value === "NEWSLETTER"
            ? newsletterEmailSet.size
            : option.value === "CUSTOMERS"
              ? customerEmailSet.size
              : option.value === "LEADS"
                ? leadEmailSet.size
                : option.value === "ALL_MARKETING"
                  ? new Set([...newsletterEmailSet, ...customerEmailSet, ...leadEmailSet]).size
                  : 0,
        importedCount:
          option.value === "NEWSLETTER"
            ? importedNewsletterSet.size
            : option.value === "CUSTOMERS"
              ? importedCustomerSet.size
              : option.value === "LEADS"
                ? importedLeadSet.size
                : option.value === "ALL_MARKETING"
                  ? importedContactCount
                  : 0,
        availableCount:
          option.value === "NEWSLETTER"
            ? newsletterCount
            : option.value === "CUSTOMERS"
              ? optedInCustomerCount
              : option.value === "LEADS"
                ? leadCount
                : option.value === "ALL_MARKETING"
                  ? new Set([
                      ...newsletterEmailSet,
                      ...customerEmailSet,
                      ...leadEmailSet,
                      ...importedNewsletterSet,
                      ...importedCustomerSet,
                      ...importedLeadSet
                    ]).size
                  : 0,
        targetListId:
          option.value === "NEWSLETTER"
            ? brevoSettings.subscribersListId
            : option.value === "CUSTOMERS"
              ? brevoSettings.customersListId
              : option.value === "LEADS"
                ? brevoSettings.contactListId
                : null,
        remoteCount:
          option.value === "NEWSLETTER" && brevoSettings.subscribersListId
            ? brevoListLookup.get(brevoSettings.subscribersListId)?.totalSubscribers ?? null
            : option.value === "CUSTOMERS" && brevoSettings.customersListId
              ? brevoListLookup.get(brevoSettings.customersListId)?.totalSubscribers ?? null
              : option.value === "LEADS" && brevoSettings.contactListId
                ? brevoListLookup.get(brevoSettings.contactListId)?.totalSubscribers ?? null
                : null
      }));

      return {
        newsletterCount,
        optedInCustomerCount,
        leadCount,
        importedContactCount,
        campaignCount,
        syncedCampaignCount,
        scheduledCampaignCount,
        sentCampaignCount,
        aiReady: openAiSettings.ready,
        aiModel: openAiSettings.model,
        audiences,
        brevoLists: brevoListsResult.lists,
        brevoError: brevoListsResult.error || brevoReportsResult.error,
        campaignReport,
        campaigns: campaignsMapped
      } satisfies EmailMarketingOverviewRecord;
    },
    {
      newsletterCount: 0,
      optedInCustomerCount: 0,
      leadCount: 0,
      importedContactCount: 0,
      campaignCount: 0,
      syncedCampaignCount: 0,
      scheduledCampaignCount: 0,
      sentCampaignCount: 0,
      aiReady: false,
      aiModel: null,
      campaignReport: {
        trackedCampaignCount: 0,
        sentCampaignCount: 0,
        totalSent: 0,
        totalDelivered: 0,
        totalUniqueViews: 0,
        totalUniqueClicks: 0,
        totalUnsubscriptions: 0,
        overallOpenRate: null,
        overallClickRate: null
      },
      audiences: EMAIL_AUDIENCE_OPTIONS.map((option) => ({
        key: option.value,
        label: option.label,
        description: option.description,
        localCount: 0,
        importedCount: 0,
        availableCount: 0,
        targetListId: null,
        remoteCount: null
      })),
      brevoLists: [] as BrevoListRecord[],
      brevoError: null,
      campaigns: [] as EmailCampaignOverviewCardRecord[]
    }
  );
}

export async function getEmailAudienceContactsPage(
  audienceType: EmailAudienceType,
  page = 1,
  pageSize = 50,
  searchEmail = ""
) {
  const audienceMeta = EMAIL_AUDIENCE_OPTIONS.find((option) => option.value === audienceType);
  const managedAudience =
    audienceType === "NEWSLETTER" || audienceType === "CUSTOMERS" || audienceType === "LEADS"
      ? audienceType
      : null;

  if (!managedAudience || !audienceMeta) {
    return null;
  }

  const normalizedSearchEmail = searchEmail.trim().toLowerCase();

  return withFallback<AdminEmailAudiencePageRecord | null>(
    async () => {
      const settings = getBrevoSettings(await getStoreSettings());
      const targetListId =
        managedAudience === "NEWSLETTER"
          ? settings.subscribersListId
          : managedAudience === "CUSTOMERS"
            ? settings.customersListId
            : settings.contactListId;

      const where = {
        audienceType: managedAudience,
        ...(normalizedSearchEmail
          ? {
              email: {
                contains: normalizedSearchEmail,
                mode: "insensitive" as const
              }
            }
          : {})
      };

      const [totalCount, brevoListsResult] = await Promise.all([
        prisma.emailContact.count({ where }),
        fetchBrevoLists(settings)
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const contacts = await prisma.emailContact.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (currentPage - 1) * pageSize,
        take: pageSize
      });
      const remoteCount =
        targetListId && !brevoListsResult.error
          ? brevoListsResult.lists.find((list) => list.id === targetListId)?.totalSubscribers ?? null
          : null;

      return {
        audienceType: managedAudience,
        audienceLabel: audienceMeta.label,
        audienceDescription: audienceMeta.description,
        contacts: contacts.map(mapEmailContact),
        totalCount,
        currentPage,
        totalPages,
        pageSize,
        searchEmail: normalizedSearchEmail,
        targetListId,
        remoteCount
      } satisfies AdminEmailAudiencePageRecord;
    },
    {
      audienceType: managedAudience,
      audienceLabel: audienceMeta.label,
      audienceDescription: audienceMeta.description,
      contacts: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize,
      searchEmail: normalizedSearchEmail,
      targetListId: null,
      remoteCount: null
    }
  );
}

export async function getCustomerAccountById(customerId: string) {
  return withFallback<CustomerAccountRecord | null>(
    async () => {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          _count: {
            select: {
              orders: true,
              reviews: true
            }
          },
          orders: {
            include: {
              items: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          rewards: {
            include: {
              customer: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          mascotRedemptions: {
            include: {
              mascot: true,
              customer: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          reviews: {
            include: {
              product: true
            },
            orderBy: {
              reviewDate: "desc"
            }
          }
        }
      });

      if (!customer) {
        return null;
      }

      const purchasedProductIds = Array.from(
        new Set(
          customer.orders
            .filter((order) => order.status === "PAID" || order.status === "FULFILLED")
            .flatMap((order) =>
              order.items.map((item) => item.productId).filter((itemId): itemId is string => Boolean(itemId))
            )
        )
      );

      return {
        customer: mapCustomer(customer),
        orders: customer.orders.map(mapOrder),
        rewards: customer.rewards.map(mapReward),
        mascotRedemptions: customer.mascotRedemptions.map(mapMascotRedemption),
        reviews: customer.reviews.map(mapReview),
        purchasedProductIds
      };
    },
    (() => {
      const customer = fallbackCustomers.find((item) => item.id === customerId);
      if (!customer) {
        return null;
      }

      const orders = fallbackOrders.filter((order) => order.customerId === customerId);
      const rewards = fallbackRewards.filter((reward) => reward.customerId === customerId);
      const reviews = fallbackReviews.filter((review) => review.customerId === customerId);
      const purchasedProductIds = Array.from(
        new Set(
          orders.flatMap((order) =>
            order.items
              .map((item) => fallbackProducts.find((product) => product.slug === item.slug)?.id)
              .filter((itemId): itemId is string => Boolean(itemId))
          )
        )
      );

      return {
        customer,
        orders,
        rewards,
        mascotRedemptions: [],
        reviews,
        purchasedProductIds
      };
    })()
  );
}

export async function getDashboardSummary() {
  return withFallback(
    async () => {
      await ensureLegacyContactFormBackfill();

      const [
        activeProductCount,
        publishedPostCount,
        customerCount,
        orderCount,
        paidRevenueAggregate,
        pointsIssuedAggregate,
        completedTodayRows,
        contactTodayRows,
        contactFormUnhandledCount
      ] =
        await prisma.$transaction([
          prisma.product.count({ where: { status: "ACTIVE" } }),
          prisma.post.count({ where: { published: true } }),
          prisma.customer.count(),
          prisma.order.count(),
          prisma.order.aggregate({
            where: {
              status: {
                in: ["PAID", "FULFILLED"]
              }
            },
            _sum: {
              totalCents: true
            }
          }),
          prisma.rewardEntry.aggregate({
            where: {
              points: {
                gt: 0
              }
            },
            _sum: {
              points: true
            }
          }),
          prisma.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(*)::int AS count
            FROM "OmbClaim"
            WHERE "completedAt" IS NOT NULL
              AND ("completedAt" AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date =
                  (CURRENT_TIMESTAMP AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date
          `,
          prisma.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(*)::int AS count
            FROM "FormSubmission"
            WHERE "formKey" = 'contact'
              AND ("createdAt" AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date =
                  (CURRENT_TIMESTAMP AT TIME ZONE ${LOS_ANGELES_TIME_ZONE})::date
          `,
          prisma.formSubmission.count({
            where: {
              formKey: "contact",
              handled: false
            }
          })
        ]);

      const [lowInventoryRows, recentOrderRows] = await Promise.all([
        prisma.product.findMany({
          where: {
            inventory: {
              lt: 125
            }
          },
          orderBy: {
            inventory: "asc"
          },
          take: 8
        }),
          prisma.order.findMany({
            include: {
              items: true,
              activityLogs: {
                orderBy: [{ createdAt: "desc" }],
                take: 3
              }
            },
            orderBy: {
              createdAt: "desc"
          },
          take: 5
        })
      ]);

      const lowInventoryProducts = lowInventoryRows.map(mapProduct);
      const recentOrders = recentOrderRows.map(mapOrder);
      const paidRevenueCents = paidRevenueAggregate._sum.totalCents ?? 0;
      const pointsIssued = pointsIssuedAggregate._sum.points ?? 0;
      const completedOmbClaimsToday = completedTodayRows[0]?.count ?? 0;
      const contactFormTodayCount = contactTodayRows[0]?.count ?? 0;

      const summary: DashboardSummary = {
        activeProductCount,
        publishedPostCount,
        customerCount,
        orderCount,
        paidRevenueCents,
        pointsIssued,
        completedOmbClaimsToday,
        contactFormTodayCount,
        contactFormUnhandledCount,
        lowInventoryProducts,
        recentOrders
      };

      return summary;
    },
    fallbackDashboardSummary
  );
}

function mapComicProject(project: any): ComicProjectRecord {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    shortDescription: project.shortDescription,
    storyOutline: project.storyOutline,
    worldRules: project.worldRules,
    visualStyleGuide: project.visualStyleGuide,
    workflowNotes: project.workflowNotes ?? null,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt)
  };
}

function mapComicCharacter(character: any): ComicCharacterRecord {
  return {
    id: character.id,
    name: character.name,
    slug: character.slug,
    role: character.role,
    appearance: character.appearance,
    personality: character.personality,
    speechGuide: character.speechGuide,
    referenceFolder: character.referenceFolder,
    referenceNotes: character.referenceNotes ?? null,
    active: character.active,
    sortOrder: character.sortOrder,
    projectId: character.projectId,
    createdAt: new Date(character.createdAt),
    updatedAt: new Date(character.updatedAt)
  };
}

function mapComicScene(scene: any): ComicSceneRecord {
  return {
    id: scene.id,
    name: scene.name,
    slug: scene.slug,
    summary: scene.summary,
    visualNotes: scene.visualNotes,
    moodNotes: scene.moodNotes,
    referenceFolder: scene.referenceFolder,
    referenceNotes: scene.referenceNotes ?? null,
    active: scene.active,
    sortOrder: scene.sortOrder,
    projectId: scene.projectId,
    createdAt: new Date(scene.createdAt),
    updatedAt: new Date(scene.updatedAt)
  };
}

function mapComicSeason(season: any): ComicSeasonRecord {
  return {
    id: season.id,
    seasonNumber: season.seasonNumber,
    slug: season.slug,
    title: season.title,
    summary: season.summary,
    outline: season.outline,
    published: season.published,
    sortOrder: season.sortOrder,
    projectId: season.projectId,
    chapterCount: season._count?.chapters ?? season.chapters?.length ?? 0,
    episodeCount:
      typeof season.episodeCount === "number"
        ? season.episodeCount
        : Array.isArray(season.chapters)
          ? season.chapters.reduce(
              (sum: number, chapter: any) => sum + (chapter._count?.episodes ?? chapter.episodes?.length ?? 0),
              0
            )
          : 0,
    publishedEpisodeCount:
      typeof season.publishedEpisodeCount === "number"
        ? season.publishedEpisodeCount
        : Array.isArray(season.chapters)
          ? season.chapters.reduce(
              (sum: number, chapter: any) =>
                sum +
                (Array.isArray(chapter.episodes)
                  ? chapter.episodes.filter((episode: any) => episode.published).length
                  : 0),
              0
            )
          : 0,
    createdAt: new Date(season.createdAt),
    updatedAt: new Date(season.updatedAt)
  };
}

function mapComicChapter(chapter: any): ComicChapterRecord {
  return {
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    slug: chapter.slug,
    title: chapter.title,
    summary: chapter.summary,
    outline: chapter.outline,
    published: chapter.published,
    sortOrder: chapter.sortOrder,
    seasonId: chapter.seasonId,
    episodeCount: chapter._count?.episodes ?? chapter.episodes?.length ?? 0,
    publishedEpisodeCount: Array.isArray(chapter.episodes)
      ? chapter.episodes.filter((episode: any) => episode.published).length
      : 0,
    createdAt: new Date(chapter.createdAt),
    updatedAt: new Date(chapter.updatedAt)
  };
}

function mapComicEpisodeAsset(asset: any): ComicEpisodeAssetRecord {
  return {
    id: asset.id,
    assetType: asset.assetType,
    title: asset.title,
    imageUrl: asset.imageUrl,
    altText: asset.altText ?? null,
    caption: asset.caption ?? null,
    sortOrder: asset.sortOrder,
    published: asset.published,
    episodeId: asset.episodeId,
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt)
  };
}

function mapComicPromptRun(run: any): ComicPromptRunRecord {
  return {
    id: run.id,
    promptType: run.promptType,
    model: run.model,
    imageModel: run.imageModel ?? null,
    status: run.status,
    inputContext: run.inputContext,
    outputSummary: run.outputSummary,
    promptPack: run.promptPack ?? null,
    referenceChecklist: run.referenceChecklist ?? null,
    errorMessage: run.errorMessage ?? null,
    episodeId: run.episodeId,
    createdAt: new Date(run.createdAt),
    updatedAt: new Date(run.updatedAt)
  };
}

function mapComicEpisode(episode: any): ComicEpisodeRecord {
  return {
    id: episode.id,
    episodeNumber: episode.episodeNumber,
    slug: episode.slug,
    title: episode.title,
    summary: episode.summary,
    outline: episode.outline,
    script: episode.script,
    panelPlan: episode.panelPlan,
    promptPack: episode.promptPack,
    requiredReferences: episode.requiredReferences,
    coverImageUrl: episode.coverImageUrl ?? null,
    coverImageAlt: episode.coverImageAlt ?? null,
    published: episode.published,
    publishedAt: episode.publishedAt ? new Date(episode.publishedAt) : null,
    sortOrder: episode.sortOrder,
    chapterId: episode.chapterId,
    assetCount: episode._count?.assets ?? episode.assets?.length ?? 0,
    promptRunCount: episode._count?.promptRuns ?? episode.promptRuns?.length ?? 0,
    latestPromptRunAt: Array.isArray(episode.promptRuns) && episode.promptRuns[0]?.createdAt
      ? new Date(episode.promptRuns[0].createdAt)
      : null,
    createdAt: new Date(episode.createdAt),
    updatedAt: new Date(episode.updatedAt)
  };
}

async function getComicProjectInternal() {
  return prisma.comicProject.findFirst({
    orderBy: [{ createdAt: "asc" }]
  });
}

export async function getComicAdminOverview() {
  return withComicFallback<ComicAdminOverviewRecord>(
    async () => {
      const [project, characterCount, sceneCount, seasonCount, chapterCount, episodeCount, publishedEpisodeCount, recentEpisodes] =
        await Promise.all([
          getComicProjectInternal(),
          prisma.comicCharacter.count(),
          prisma.comicScene.count(),
          prisma.comicSeason.count(),
          prisma.comicChapter.count(),
          prisma.comicEpisode.count(),
          prisma.comicEpisode.count({ where: { published: true } }),
          prisma.comicEpisode.findMany({
            include: {
              chapter: {
                include: {
                  season: true
                }
              },
              _count: {
                select: {
                  assets: true,
                  promptRuns: true
                }
              },
              promptRuns: {
                orderBy: [{ createdAt: "desc" }],
                take: 1
              }
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 6
          })
        ]);

      return {
        project: project ? mapComicProject(project) : null,
        characterCount,
        sceneCount,
        seasonCount,
        chapterCount,
        episodeCount,
        publishedEpisodeCount,
        recentEpisodes: recentEpisodes.map((episode) => ({
          ...mapComicEpisode(episode),
          seasonTitle: episode.chapter.season.title,
          seasonSlug: episode.chapter.season.slug,
          chapterTitle: episode.chapter.title,
          chapterSlug: episode.chapter.slug
        }))
      };
    },
    {
      project: null,
      characterCount: 0,
      sceneCount: 0,
      seasonCount: 0,
      chapterCount: 0,
      episodeCount: 0,
      publishedEpisodeCount: 0,
      recentEpisodes: []
    }
  );
}

export async function getComicProject() {
  return withComicFallback<ComicProjectRecord | null>(
    async () => {
      const project = await getComicProjectInternal();
      return project ? mapComicProject(project) : null;
    },
    null
  );
}

export async function getComicCharacters() {
  return withComicFallback<ComicCharacterRecord[]>(
    async () => {
      const characters = await prisma.comicCharacter.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return characters.map(mapComicCharacter);
    },
    []
  );
}

export async function getComicCharacterById(id: string) {
  return withComicFallback<ComicCharacterRecord | null>(
    async () => {
      const character = await prisma.comicCharacter.findUnique({ where: { id } });
      return character ? mapComicCharacter(character) : null;
    },
    null
  );
}

export async function getComicScenes() {
  return withComicFallback<ComicSceneRecord[]>(
    async () => {
      const scenes = await prisma.comicScene.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return scenes.map(mapComicScene);
    },
    []
  );
}

export async function getComicSceneById(id: string) {
  return withComicFallback<ComicSceneRecord | null>(
    async () => {
      const scene = await prisma.comicScene.findUnique({ where: { id } });
      return scene ? mapComicScene(scene) : null;
    },
    null
  );
}

export async function getComicSeasonsForAdmin() {
  return withComicFallback<ComicSeasonRecord[]>(
    async () => {
      const seasons = await prisma.comicSeason.findMany({
        include: {
          chapters: {
            include: {
              episodes: {
                select: {
                  id: true,
                  published: true
                }
              }
            }
          },
          _count: {
            select: {
              chapters: true
            }
          }
        },
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return seasons.map(mapComicSeason);
    },
    []
  );
}

export async function getComicSeasonById(id: string) {
  return withComicFallback<ComicSeasonDetailRecord | null>(
    async () => {
      const season = await prisma.comicSeason.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              chapters: true
            }
          },
          chapters: {
            include: {
              _count: {
                select: {
                  episodes: true
                }
              },
              episodes: {
                select: {
                  id: true,
                  published: true
                }
              }
            },
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!season) {
        return null;
      }

      return {
        season: mapComicSeason(season),
        chapters: season.chapters.map(mapComicChapter)
      };
    },
    null
  );
}

export async function getComicChapterById(id: string) {
  return withComicFallback<ComicChapterDetailRecord | null>(
    async () => {
      const chapter = await prisma.comicChapter.findUnique({
        where: { id },
        include: {
          season: {
            include: {
              _count: {
                select: {
                  chapters: true
                }
              }
            }
          },
          _count: {
            select: {
              episodes: true
            }
          },
          episodes: {
            include: {
              _count: {
                select: {
                  assets: true,
                  promptRuns: true
                }
              },
              promptRuns: {
                orderBy: [{ createdAt: "desc" }],
                take: 1
              }
            },
            orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!chapter) {
        return null;
      }

      return {
        season: mapComicSeason(chapter.season),
        chapter: mapComicChapter(chapter),
        episodes: chapter.episodes.map(mapComicEpisode)
      };
    },
    null
  );
}

export async function getComicEpisodeById(id: string) {
  return withComicFallback<ComicEpisodeDetailRecord | null>(
    async () => {
      const episode = await prisma.comicEpisode.findUnique({
        where: { id },
        include: {
          chapter: {
            include: {
              season: {
                include: {
                  project: true
                }
              }
            }
          },
          assets: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          },
          promptRuns: {
            orderBy: [{ createdAt: "desc" }]
          }
        }
      });

      if (!episode) {
        return null;
      }

      const [characters, scenes] = await Promise.all([
        prisma.comicCharacter.findMany({
          where: { projectId: episode.chapter.season.projectId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.comicScene.findMany({
          where: { projectId: episode.chapter.season.projectId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        })
      ]);

      return {
        project: episode.chapter.season.project ? mapComicProject(episode.chapter.season.project) : null,
        season: mapComicSeason(episode.chapter.season),
        chapter: mapComicChapter(episode.chapter),
        episode: mapComicEpisode(episode),
        assets: episode.assets.map(mapComicEpisodeAsset),
        promptRuns: episode.promptRuns.map(mapComicPromptRun),
        characters: characters.map(mapComicCharacter),
        scenes: scenes.map(mapComicScene)
      };
    },
    null
  );
}

export async function getComicPromptStudioPage(selectedEpisodeId?: string | null) {
  return withComicFallback<ComicPromptStudioPageRecord>(
    async () => {
      const [project, characters, scenes, seasons, selectedEpisode] = await Promise.all([
        getComicProjectInternal(),
        prisma.comicCharacter.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.comicScene.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.comicSeason.findMany({
          include: {
            chapters: {
              include: {
                episodes: {
                  include: {
                    _count: {
                      select: {
                        assets: true,
                        promptRuns: true
                      }
                    },
                    promptRuns: {
                      orderBy: [{ createdAt: "desc" }],
                      take: 1
                    }
                  },
                  orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
                },
                _count: {
                  select: {
                    episodes: true
                  }
                }
              },
              orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
            },
            _count: {
              select: {
                chapters: true
              }
            }
          },
          orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        selectedEpisodeId ? getComicEpisodeById(selectedEpisodeId) : Promise.resolve(null)
      ]);

      return {
        project: project ? mapComicProject(project) : null,
        characters: characters.map(mapComicCharacter),
        scenes: scenes.map(mapComicScene),
        seasons: seasons.map((season) => ({
          ...mapComicSeason(season),
          chapters: season.chapters.map((chapter) => ({
            ...mapComicChapter(chapter),
            episodes: chapter.episodes.map(mapComicEpisode)
          }))
        })),
        selectedEpisode
      };
    },
    {
      project: null,
      characters: [],
      scenes: [],
      seasons: [],
      selectedEpisode: null
    }
  );
}

export async function getPublishedComicLibrary() {
  return withComicFallback<ComicPublicSeasonRecord[]>(
    async () => {
      const seasons = await prisma.comicSeason.findMany({
        where: {
          published: true,
          chapters: {
            some: {
              published: true,
              episodes: {
                some: {
                  published: true,
                  assets: {
                    some: {
                      published: true
                    }
                  }
                }
              }
            }
          }
        },
        include: {
          chapters: {
            where: {
              published: true,
              episodes: {
                some: {
                  published: true,
                  assets: {
                    some: {
                      published: true
                    }
                  }
                }
              }
            },
            include: {
              episodes: {
                where: {
                  published: true,
                  assets: {
                    some: {
                      published: true
                    }
                  }
                },
                include: {
                  assets: {
                    where: { published: true },
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
                  }
                },
                orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
              }
            },
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });

      return seasons.map((season) => ({
        ...mapComicSeason(season),
        chapters: season.chapters.map((chapter): ComicPublicChapterRecord => ({
          ...mapComicChapter(chapter),
          seasonTitle: season.title,
          seasonSlug: season.slug,
          episodes: chapter.episodes.map((episode): ComicPublicEpisodeRecord => ({
            ...mapComicEpisode(episode),
            assets: episode.assets.map(mapComicEpisodeAsset),
            seasonTitle: season.title,
            seasonSlug: season.slug,
            chapterTitle: chapter.title,
            chapterSlug: chapter.slug
          }))
        }))
      }));
    },
    []
  );
}

export async function getPublishedComicSeasonBySlug(seasonSlug: string) {
  const seasons = await getPublishedComicLibrary();
  return seasons.find((season) => season.slug === seasonSlug) ?? null;
}

export async function getPublishedComicChapterBySlugs(seasonSlug: string, chapterSlug: string) {
  const season = await getPublishedComicSeasonBySlug(seasonSlug);
  if (!season) {
    return null;
  }

  return season.chapters.find((chapter) => chapter.slug === chapterSlug) ?? null;
}

export async function getPublishedComicEpisodeBySlugs(
  seasonSlug: string,
  chapterSlug: string,
  episodeSlug: string
) {
  const chapter = await getPublishedComicChapterBySlugs(seasonSlug, chapterSlug);
  if (!chapter) {
    return null;
  }

  return chapter.episodes.find((episode) => episode.slug === episodeSlug) ?? null;
}
