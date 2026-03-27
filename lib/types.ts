export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type OrderStatus = "PENDING" | "PAID" | "FULFILLED" | "CANCELLED" | "REFUNDED";
export type FulfillmentStatus = "UNFULFILLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
export type RewardType = "EARNED" | "REDEEMED" | "ADJUSTMENT";
export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";
export type CouponDiscountType = "PERCENT" | "FIXED_AMOUNT";
export type CouponUsageMode = "SINGLE_USE" | "UNLIMITED";

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
  content: string;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

export type OrderItemRecord = {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  imageUrl: string;
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
  notes: string | null;
  stripeCheckoutId: string | null;
  stripePaymentIntentId: string | null;
  customerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemRecord[];
};

export type CouponRecord = {
  id: string;
  code: string;
  content: string;
  active: boolean;
  combinable: boolean;
  appliesToAll: boolean;
  productCodes: string[];
  discountType: CouponDiscountType;
  percentOff: number | null;
  amountOffCents: number | null;
  usageMode: CouponUsageMode;
  usageCount: number;
  orderCount?: number;
  createdAt: Date;
  updatedAt: Date;
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

export type ProductReviewRecord = {
  id: string;
  rating: number;
  title: string;
  content: string;
  displayName: string;
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
  createdAt: Date;
  updatedAt: Date;
};
