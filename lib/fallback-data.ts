import type {
  BeautyPostRecord,
  CustomerRecord,
  DashboardSummary,
  OrderRecord,
  ProductRecord,
  ProductReviewRecord,
  RewardEntryRecord,
  StoreSettingsRecord
} from "@/lib/types";
import { getDefaultProductImageUrl, getLocalProductGallery } from "@/lib/product-media";
import {
  samplePosts,
  sampleProducts,
  sampleReviews,
  sampleStoreSettings
} from "@/lib/sample-store-data";

export const fallbackProducts: ProductRecord[] = sampleProducts;

export const fallbackPosts: BeautyPostRecord[] = samplePosts;

export const fallbackCustomers: CustomerRecord[] = [
  {
    id: "cus_ava",
    email: "ava@neatiquebeauty.com",
    firstName: "Ava",
    lastName: "Miller",
    hasPassword: false,
    passwordSetAt: null,
    lastLoginAt: null,
    marketingOptIn: true,
    loyaltyPoints: 182,
    totalSpentCents: 16400,
    orderCount: 1,
    reviewCount: 1,
    createdAt: new Date("2026-03-08T09:00:00.000Z"),
    updatedAt: new Date("2026-03-21T09:00:00.000Z")
  },
  {
    id: "cus_emma",
    email: "emma@example.com",
    firstName: "Emma",
    lastName: "Roberts",
    hasPassword: false,
    passwordSetAt: null,
    lastLoginAt: null,
    marketingOptIn: true,
    loyaltyPoints: 96,
    totalSpentCents: 9600,
    orderCount: 1,
    reviewCount: 1,
    createdAt: new Date("2026-03-11T09:00:00.000Z"),
    updatedAt: new Date("2026-03-22T09:00:00.000Z")
  },
  {
    id: "cus_zoe",
    email: "zoe@example.com",
    firstName: "Zoe",
    lastName: "Turner",
    hasPassword: false,
    passwordSetAt: null,
    lastLoginAt: null,
    marketingOptIn: false,
    loyaltyPoints: 39,
    totalSpentCents: 3900,
    orderCount: 1,
    reviewCount: 0,
    createdAt: new Date("2026-03-14T09:00:00.000Z"),
    updatedAt: new Date("2026-03-20T09:00:00.000Z")
  }
];

export const fallbackOrders: OrderRecord[] = [
  {
    id: "ord_1003",
    orderNumber: "NEA-1003",
    email: "emma@example.com",
    status: "PAID",
    fulfillmentStatus: "SHIPPED",
    currency: "USD",
    subtotalCents: 9000,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 9000,
    pointsEarned: 90,
    shippingName: "Emma Roberts",
    shippingAddress1: "1480 Sunset Blvd",
    shippingAddress2: null,
    shippingCity: "Los Angeles",
    shippingState: "CA",
    shippingPostalCode: "90026",
    shippingCountry: "US",
    notes: null,
    stripeCheckoutId: "cs_test_123",
    stripePaymentIntentId: "pi_test_123",
    customerId: "cus_emma",
    createdAt: new Date("2026-03-22T09:00:00.000Z"),
    updatedAt: new Date("2026-03-23T09:00:00.000Z"),
    items: [
      {
        id: "item_1003_a",
        name: "PDRN Serum",
        slug: "pdrn-serum",
        quantity: 1,
        unitPriceCents: 4800,
        lineTotalCents: 4800,
        imageUrl: getDefaultProductImageUrl("pdrn-serum") ?? "/products/pdrn-serum.svg"
      },
      {
        id: "item_1003_b",
        name: "Snail Mucin Cream",
        slug: "snail-mucin-cream",
        quantity: 1,
        unitPriceCents: 4200,
        lineTotalCents: 4200,
        imageUrl: getDefaultProductImageUrl("snail-mucin-cream") ?? "/products/snail-mucin-cream.svg"
      }
    ]
  },
  {
    id: "ord_1002",
    orderNumber: "NEA-1002",
    email: "zoe@example.com",
    status: "PENDING",
    fulfillmentStatus: "UNFULFILLED",
    currency: "USD",
    subtotalCents: 3900,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 3900,
    pointsEarned: 39,
    shippingName: "Zoe Turner",
    shippingAddress1: "225 Lake Shore Dr",
    shippingAddress2: null,
    shippingCity: "Chicago",
    shippingState: "IL",
    shippingPostalCode: "60601",
    shippingCountry: "US",
    notes: "Awaiting payment confirmation.",
    stripeCheckoutId: null,
    stripePaymentIntentId: null,
    customerId: "cus_zoe",
    createdAt: new Date("2026-03-21T09:00:00.000Z"),
    updatedAt: new Date("2026-03-21T09:00:00.000Z"),
    items: [
      {
        id: "item_1002_a",
        name: "Snail Mucin Serum",
        slug: "snail-mucin-serum",
        quantity: 1,
        unitPriceCents: 3900,
        lineTotalCents: 3900,
        imageUrl: getDefaultProductImageUrl("snail-mucin-serum") ?? "/products/snail-mucin-serum.svg"
      }
    ]
  },
  {
    id: "ord_1001",
    orderNumber: "NEA-1001",
    email: "ava@neatiquebeauty.com",
    status: "PAID",
    fulfillmentStatus: "PROCESSING",
    currency: "USD",
    subtotalCents: 5200,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 5200,
    pointsEarned: 52,
    shippingName: "Ava Miller",
    shippingAddress1: "77 Spring St",
    shippingAddress2: "Unit 4A",
    shippingCity: "New York",
    shippingState: "NY",
    shippingPostalCode: "10012",
    shippingCountry: "US",
    notes: null,
    stripeCheckoutId: "cs_test_1001",
    stripePaymentIntentId: "pi_test_1001",
    customerId: "cus_ava",
    createdAt: new Date("2026-03-20T09:00:00.000Z"),
    updatedAt: new Date("2026-03-20T09:00:00.000Z"),
    items: [
      {
        id: "item_1001_a",
        name: "PDRN Cream",
        slug: "pdrn-cream",
        quantity: 1,
        unitPriceCents: 5200,
        lineTotalCents: 5200,
        imageUrl: getDefaultProductImageUrl("pdrn-cream") ?? "/products/pdrn-cream.svg"
      }
    ]
  }
];

export const fallbackRewards: RewardEntryRecord[] = [
  {
    id: "reward_1",
    type: "EARNED",
    points: 52,
    note: "Paid order NEA-1001",
    orderId: "ord_1001",
    customerId: "cus_ava",
    customerEmail: "ava@neatiquebeauty.com",
    createdAt: new Date("2026-03-20T09:05:00.000Z")
  },
  {
    id: "reward_2",
    type: "EARNED",
    points: 90,
    note: "Paid order NEA-1003",
    orderId: "ord_1003",
    customerId: "cus_emma",
    customerEmail: "emma@example.com",
    createdAt: new Date("2026-03-22T10:00:00.000Z")
  },
  {
    id: "reward_3",
    type: "ADJUSTMENT",
    points: 40,
    note: "Launch campaign bonus",
    orderId: null,
    customerId: "cus_ava",
    customerEmail: "ava@neatiquebeauty.com",
    createdAt: new Date("2026-03-23T11:00:00.000Z")
  }
];

export const fallbackReviews: ProductReviewRecord[] = sampleReviews;

export const fallbackSettings: StoreSettingsRecord = sampleStoreSettings;

export const fallbackDashboardSummary: DashboardSummary = {
  activeProductCount: fallbackProducts.filter((product) => product.status === "ACTIVE").length,
  publishedPostCount: fallbackPosts.filter((post) => post.published).length,
  customerCount: fallbackCustomers.length,
  orderCount: fallbackOrders.length,
  paidRevenueCents: fallbackOrders
    .filter((order) => order.status === "PAID" || order.status === "FULFILLED")
    .reduce((sum, order) => sum + order.totalCents, 0),
  pointsIssued: fallbackRewards.reduce((sum, reward) => sum + Math.max(reward.points, 0), 0),
  lowInventoryProducts: fallbackProducts.filter((product) => product.inventory < 125),
  recentOrders: fallbackOrders
};
