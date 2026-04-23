export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type OrderStatus = "PENDING" | "PAID" | "FULFILLED" | "CANCELLED" | "REFUNDED";
export type FulfillmentStatus = "UNFULFILLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
export type RewardType = "EARNED" | "REDEEMED" | "ADJUSTMENT";
export type MascotRedemptionStatus = "REQUESTED" | "FULFILLED" | "CANCELLED";
export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";
export type CouponDiscountType = "PERCENT" | "FIXED_AMOUNT";
export type CouponUsageMode = "SINGLE_USE" | "UNLIMITED";
export type EmailCampaignStatus = "DRAFT" | "SYNCED" | "SCHEDULED" | "SENT" | "FAILED";
export type EmailAudienceType = "NEWSLETTER" | "CUSTOMERS" | "LEADS" | "ALL_MARKETING" | "CUSTOM";
export type FollowEmailProcessKey = "OMB" | "RYO";
export type FollowEmailStageKey = "WAITING_STEP_2" | "WAITING_LAST_STEP" | "COMPLETED";
export type ComicPromptRunStatus = "DRAFT" | "READY" | "FAILED" | "APPROVED";

export type PostExternalLinkRecord = {
  label: string;
  url: string;
};

export type PostExternalLinkAuditStatus = "HEALTHY" | "REDIRECTED" | "BROKEN";

export type PostExternalLinkAuditResultRecord = {
  label: string;
  url: string;
  finalUrl: string | null;
  statusCode: number | null;
  status: PostExternalLinkAuditStatus;
  error: string | null;
};

export type PostExternalLinkAuditEntryRecord = {
  postId: string;
  postTitle: string;
  postSlug: string;
  published: boolean;
  totalLinks: number;
  healthyLinks: number;
  redirectedLinks: number;
  brokenLinks: number;
  results: PostExternalLinkAuditResultRecord[];
};

export type PostExternalLinkAuditRecord = {
  checkedAt: Date;
  totalPostsChecked: number;
  totalPostsWithLinks: number;
  totalLinksChecked: number;
  healthyLinks: number;
  redirectedLinks: number;
  brokenLinks: number;
  entries: PostExternalLinkAuditEntryRecord[];
};

export type ProductRecord = {
  id: string;
  productCode: string;
  productShortName: string | null;
  amazonAsin: string | null;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  shortDescription: string;
  description: string;
  details: string;
  imageUrl: string;
  galleryImages: string[];
  featured: boolean;
  status: ProductStatus;
  inventory: number;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  pointsReward: number;
  stripePriceId: string | null;
  reviewCount?: number;
  averageRating?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BeautyPostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: number;
  coverImageUrl: string;
  coverImageAlt: string | null;
  previewImageUrl: string | null;
  previewImageGeneratedAt: Date | null;
  previewImagePrompt: string | null;
  content: string;
  seoTitle: string;
  seoDescription: string;
  aiGenerated: boolean;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  imagePrompt: string | null;
  externalLinks: PostExternalLinkRecord[];
  generatedAt: Date | null;
  sourceProductId: string | null;
  sourceProductName: string | null;
  sourceProductSlug: string | null;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiPostAutomationOverviewRecord = {
  enabled: boolean;
  cadenceDays: number;
  autoPublish: boolean;
  includeExternalLinks: boolean;
  lastRunAt: Date | null;
  lastStatus: string | null;
  lastPostId: string | null;
  lastPostTitle: string | null;
  rotationCursor: string | null;
  nextProductId: string | null;
  nextProductName: string | null;
  nextProductCode: string | null;
  aiPostCount: number;
  publishedAiPostCount: number;
  draftAiPostCount: number;
  model: string | null;
  imageModel: string | null;
};

export type CustomerRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  hasPassword: boolean;
  passwordSetAt: Date | null;
  lastLoginAt: Date | null;
  marketingOptIn: boolean;
  loyaltyPoints: number;
  totalSpentCents: number;
  orderCount?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailContactRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  audienceType: EmailAudienceType;
  source: string;
  brevoContactId: number | null;
  brevoListId: number | null;
  listName: string | null;
  emailBlacklisted: boolean;
  metadata: string | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderItemRecord = {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  imageUrl: string;
};

export type OrderActivityLogRecord = {
  id: string;
  eventType: string;
  summary: string;
  detail: string | null;
  createdAt: Date;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  pointsEarned: number;
  couponCode: string | null;
  couponId: string | null;
  shippingName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  billingName: string | null;
  billingAddress1: string | null;
  billingAddress2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  notes: string | null;
  stripeCheckoutId: string | null;
  stripePaymentIntentId: string | null;
  customerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemRecord[];
  activityLogs?: OrderActivityLogRecord[];
};

export type AdminOrderPageRecord = {
  orders: OrderRecord[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
};

export type CouponRecord = {
  id: string;
  code: string;
  content: string;
  active: boolean;
  expired: boolean;
  combinable: boolean;
  appliesToAll: boolean;
  productCodes: string[];
  discountType: CouponDiscountType;
  percentOff: number | null;
  amountOffCents: number | null;
  usageMode: CouponUsageMode;
  usageCount: number;
  expiresAt: Date | null;
  orderCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminEmailAudiencePageRecord = {
  audienceType: EmailAudienceType;
  audienceLabel: string;
  audienceDescription: string;
  contacts: EmailContactRecord[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchEmail: string;
  targetListId: number | null;
  remoteCount: number | null;
};

export type RewardEntryRecord = {
  id: string;
  type: RewardType;
  points: number;
  note: string | null;
  orderId: string | null;
  customerId: string;
  customerEmail: string;
  createdAt: Date;
};

export type MascotRewardRecord = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  pointsCost: number;
  active: boolean;
  sortOrder: number;
  redemptionCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MascotRedemptionRecord = {
  id: string;
  pointsSpent: number;
  status: MascotRedemptionStatus;
  email: string;
  fullName: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  adminNote: string | null;
  fulfilledAt: Date | null;
  customerId: string;
  customerEmail: string;
  mascotId: string;
  mascotName: string;
  mascotSku: string;
  mascotImageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductReviewRecord = {
  id: string;
  rating: number;
  title: string;
  content: string;
  displayName: string;
  reviewDate: Date;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  adminNotes: string | null;
  source: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  customerId: string | null;
  customerEmail: string | null;
  orderId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminReviewProductSummary = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  category: string;
  status: ProductStatus;
  shortDescription: string;
  averageRating: number | null;
  totalReviewCount: number;
  publishedReviewCount: number;
  pendingReviewCount: number;
  hiddenReviewCount: number;
};

export type AdminProductReviewPageRecord = {
  product: ProductRecord;
  reviews: ProductReviewRecord[];
  totalReviewCount: number;
  publishedReviewCount: number;
  pendingReviewCount: number;
  hiddenReviewCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
};

export type CustomerAccountRecord = {
  customer: CustomerRecord;
  orders: OrderRecord[];
  rewards: RewardEntryRecord[];
  mascotRedemptions: MascotRedemptionRecord[];
  reviews: ProductReviewRecord[];
  purchasedProductIds: string[];
};

export type DashboardSummary = {
  activeProductCount: number;
  publishedPostCount: number;
  customerCount: number;
  orderCount: number;
  paidRevenueCents: number;
  pointsIssued: number;
  completedOmbClaimsToday: number;
  contactFormTodayCount: number;
  contactFormUnhandledCount: number;
  lowInventoryProducts: ProductRecord[];
  recentOrders: OrderRecord[];
};

export type StoreSettingsRecord = Record<string, string>;

export type FormSubmissionRecord = {
  id: string;
  formKey: string;
  formLabel: string;
  email: string;
  name: string | null;
  subject: string | null;
  summary: string | null;
  message: string | null;
  payload: string | null;
  handled: boolean;
  handledAt: Date | null;
  legacyContactSubmissionId: string | null;
  brevoContact: EmailContactRecord | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FormSubmissionSummaryRecord = {
  formKey: string;
  formLabel: string;
  description: string;
  totalCount: number;
  unhandledCount: number;
  latestSubmittedAt: Date | null;
};

export type AdminFormSubmissionPageRecord = {
  formKey: string;
  formLabel: string;
  description: string;
  submissions: FormSubmissionRecord[];
  totalCount: number;
  unhandledCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchEmail: string;
};

export type OmbClaimRecord = {
  id: string;
  platformKey: string;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone: string | null;
  purchasedProduct: string | null;
  reviewRating: number | null;
  commentText: string | null;
  reviewDestinationUrl: string | null;
  screenshotName: string | null;
  screenshotMimeType: string | null;
  screenshotBytes: number | null;
  extraBottleAddress: string | null;
  giftSent: boolean;
  giftSentAt: Date | null;
  adminNote: string | null;
  completedAt: Date | null;
  brevoContact: EmailContactRecord | null;
  followEmails: FollowEmailLogRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type RyoClaimRecord = {
  id: string;
  platformKey: string;
  platformLabel: string;
  orderId: string;
  name: string;
  email: string;
  phone: string | null;
  purchasedProduct: string | null;
  reviewRating: number | null;
  commentText: string | null;
  reviewDestinationUrl: string | null;
  screenshotName: string | null;
  screenshotMimeType: string | null;
  screenshotBytes: number | null;
  customerId: string | null;
  pointsAwarded: number;
  rewardGranted: boolean;
  rewardGrantedAt: Date | null;
  adminNote: string | null;
  completedAt: Date | null;
  brevoContact: EmailContactRecord | null;
  followEmails: FollowEmailLogRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type FollowEmailLogRecord = {
  id: string;
  processKey: FollowEmailProcessKey;
  stageKey: FollowEmailStageKey;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  bodyText: string;
  createdAt: Date;
};

export type FollowEmailTemplateRecord = {
  stageKey: FollowEmailStageKey;
  stageLabel: string;
  subject: string;
  bodyText: string;
  sentTodayCount: number;
};

export type FollowEmailOverviewRecord = {
  processKey: FollowEmailProcessKey;
  processLabel: string;
  enabled: boolean;
  delayMinutes: number;
  totalSentToday: number;
  templates: FollowEmailTemplateRecord[];
};

export type AdminOmbClaimPageRecord = {
  claims: OmbClaimRecord[];
  totalCount: number;
  completedTodayCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchEmail: string;
  searchPlatform: string;
  searchProduct: string;
  platformOptions: Array<{ value: string; label: string }>;
  productOptions: string[];
};

export type EmailMarketingAudienceSummaryRecord = {
  key: EmailAudienceType;
  label: string;
  description: string;
  localCount: number;
  importedCount: number;
  availableCount: number;
  targetListId: number | null;
  remoteCount: number | null;
};

export type BrevoListRecord = {
  id: number;
  name: string;
  totalSubscribers: number;
  folderName: string | null;
};

export type BrevoCampaignGlobalStatsRecord = {
  sent: number;
  delivered: number;
  uniqueViews: number;
  uniqueClicks: number;
  unsubscriptions: number;
  hardBounces: number;
  softBounces: number;
  complaints: number;
  opensRate: number | null;
  clickRate: number | null;
};

export type BrevoCampaignReportRecord = {
  id: number;
  status: string | null;
  name: string;
  subject: string | null;
  senderEmail: string | null;
  createdAt: Date | null;
  sentDate: Date | null;
  stats: BrevoCampaignGlobalStatsRecord | null;
};

export type EmailCampaignWithReportRecord = EmailCampaignRecord & {
  brevoReport: BrevoCampaignReportRecord | null;
};

export type EmailCampaignOverviewCardRecord = {
  id: string;
  name: string;
  subject: string;
  audienceType: EmailAudienceType;
  status: EmailCampaignStatus;
  brevoCampaignId: number | null;
  lastSyncedAt: Date | null;
  scheduledAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  brevoReport: BrevoCampaignReportRecord | null;
};

export type EmailCampaignSummaryReportRecord = {
  trackedCampaignCount: number;
  sentCampaignCount: number;
  totalSent: number;
  totalDelivered: number;
  totalUniqueViews: number;
  totalUniqueClicks: number;
  totalUnsubscriptions: number;
  overallOpenRate: number | null;
  overallClickRate: number | null;
};

export type EmailCampaignRecord = {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  strategyBrief: string | null;
  audienceType: EmailAudienceType;
  customListIds: string | null;
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  contentHtml: string;
  contentText: string | null;
  scheduledAt: Date | null;
  status: EmailCampaignStatus;
  brevoCampaignId: number | null;
  lastSyncedAt: Date | null;
  lastTestedAt: Date | null;
  lastSentAt: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailMarketingOverviewRecord = {
  newsletterCount: number;
  optedInCustomerCount: number;
  leadCount: number;
  importedContactCount: number;
  campaignCount: number;
  syncedCampaignCount: number;
  scheduledCampaignCount: number;
  sentCampaignCount: number;
  aiReady: boolean;
  aiModel: string | null;
  audiences: EmailMarketingAudienceSummaryRecord[];
  brevoLists: BrevoListRecord[];
  brevoError: string | null;
  campaignReport: EmailCampaignSummaryReportRecord;
  campaigns: EmailCampaignOverviewCardRecord[];
};

export type ComicProjectRecord = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  storyOutline: string;
  worldRules: string;
  visualStyleGuide: string;
  workflowNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicCharacterRecord = {
  id: string;
  name: string;
  slug: string;
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceFolder: string;
  referenceNotes: string | null;
  active: boolean;
  sortOrder: number;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicSceneRecord = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceFolder: string;
  referenceNotes: string | null;
  active: boolean;
  sortOrder: number;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicChapterSceneReferenceRecord = {
  label: string;
  fileName: string;
  relativePath: string;
  extension: string;
};

export type ComicEpisodeAssetRecord = {
  id: string;
  assetType: string;
  title: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  published: boolean;
  episodeId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicPromptRunRecord = {
  id: string;
  promptType: string;
  model: string;
  imageModel: string | null;
  status: ComicPromptRunStatus;
  inputContext: string;
  outputSummary: string;
  promptPack: string | null;
  referenceChecklist: string | null;
  errorMessage: string | null;
  episodeId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicEpisodeRecord = {
  id: string;
  episodeNumber: number;
  slug: string;
  title: string;
  summary: string;
  outline: string;
  script: string;
  panelPlan: string;
  promptPack: string;
  requiredReferences: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  published: boolean;
  publishedAt: Date | null;
  sortOrder: number;
  chapterId: string;
  assetCount?: number;
  promptRunCount?: number;
  latestPromptRunAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicChapterRecord = {
  id: string;
  chapterNumber: number;
  slug: string;
  title: string;
  summary: string;
  outline: string;
  published: boolean;
  sortOrder: number;
  seasonId: string;
  episodeCount?: number;
  publishedEpisodeCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicSeasonRecord = {
  id: string;
  seasonNumber: number;
  slug: string;
  title: string;
  summary: string;
  outline: string;
  published: boolean;
  sortOrder: number;
  projectId: string;
  chapterCount?: number;
  episodeCount?: number;
  publishedEpisodeCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicAdminOverviewRecord = {
  project: ComicProjectRecord | null;
  characterCount: number;
  sceneCount: number;
  seasonCount: number;
  chapterCount: number;
  episodeCount: number;
  publishedEpisodeCount: number;
  recentEpisodes: Array<
    ComicEpisodeRecord & {
      seasonTitle: string;
      seasonSlug: string;
      chapterTitle: string;
      chapterSlug: string;
    }
  >;
};

export type ComicSeasonDetailRecord = {
  season: ComicSeasonRecord;
  chapters: ComicChapterRecord[];
};

export type ComicChapterDetailRecord = {
  season: ComicSeasonRecord;
  chapter: ComicChapterRecord;
  episodes: ComicEpisodeRecord[];
};

export type ComicEpisodeDetailRecord = {
  project: ComicProjectRecord | null;
  season: ComicSeasonRecord;
  chapter: ComicChapterRecord;
  episode: ComicEpisodeRecord;
  assets: ComicEpisodeAssetRecord[];
  promptRuns: ComicPromptRunRecord[];
  characters: ComicCharacterRecord[];
  scenes: ComicSceneRecord[];
  chapterSceneReferenceFolder: string;
  chapterSceneReferences: ComicChapterSceneReferenceRecord[];
};

export type ComicPromptStudioPageRecord = {
  project: ComicProjectRecord | null;
  characters: ComicCharacterRecord[];
  scenes: ComicSceneRecord[];
  seasons: Array<
    ComicSeasonRecord & {
      chapters: Array<
        ComicChapterRecord & {
          episodes: ComicEpisodeRecord[];
        }
      >;
    }
  >;
  selectedEpisode: ComicEpisodeDetailRecord | null;
};

export type ComicPublicEpisodeRecord = ComicEpisodeRecord & {
  assets: ComicEpisodeAssetRecord[];
  seasonTitle: string;
  seasonSlug: string;
  chapterTitle: string;
  chapterSlug: string;
};

export type ComicPublicChapterRecord = ComicChapterRecord & {
  seasonTitle: string;
  seasonSlug: string;
  episodes: ComicPublicEpisodeRecord[];
};

export type ComicPublicSeasonRecord = ComicSeasonRecord & {
  chapters: ComicPublicChapterRecord[];
};
