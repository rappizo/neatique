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
import { buildSiteImageUrl } from "@/lib/site-media";

export const fallbackProducts: ProductRecord[] = [
  {
    id: "prod_pdrn_cream",
    name: "PDRN Cream",
    slug: "pdrn-cream",
    tagline: "Daily repair cream for calm, comforted, resilient-looking skin.",
    category: "Barrier Care",
    shortDescription: "A nourishing finishing cream that wraps the skin in moisture and bounce.",
    description:
      "Neatique PDRN Cream is designed for skin that needs visible comfort, density, and daily recovery support. The texture melts in smoothly, sealing hydration while helping the complexion look rested, balanced, and refined.",
    details:
      "Ideal for dry, dehydrated, or stressed skin.\nUse as the final step of your evening ritual or under SPF in the morning.\nPairs beautifully with PDRN Serum for a layered bounce routine.",
    imageUrl: getDefaultProductImageUrl("pdrn-cream") ?? "/products/pdrn-cream.svg",
    galleryImages: getLocalProductGallery("pdrn-cream"),
    featured: true,
    status: "ACTIVE",
    inventory: 120,
    priceCents: 5200,
    compareAtPriceCents: 6400,
    currency: "USD",
    pointsReward: 52,
    stripePriceId: null,
    createdAt: new Date("2026-03-01T08:00:00.000Z"),
    updatedAt: new Date("2026-03-20T08:00:00.000Z")
  },
  {
    id: "prod_pdrn_serum",
    name: "PDRN Serum",
    slug: "pdrn-serum",
    tagline: "A silky Salmon PDRN serum that supports smoothness, bounce, and glow.",
    category: "Repair Serum",
    shortDescription: "Lightweight, silky hydration with a visibly polished, radiant finish.",
    description:
      "Formulated around Salmon PDRN and a 5-peptide blend, Neatique PDRN Serum is designed for skin that looks dull, tired, or texturally uneven. The fast-absorbing formula helps support a smoother-looking, firmer-feeling, more radiant complexion without leaving behind heaviness.",
    details:
      "Works well for normal, combination, and dehydrated skin.\nApply after cleansing and before cream.\nUse morning and night for hydration, glow, and layering support.",
    imageUrl: getDefaultProductImageUrl("pdrn-serum") ?? "/products/pdrn-serum.svg",
    galleryImages: getLocalProductGallery("pdrn-serum"),
    featured: true,
    status: "ACTIVE",
    inventory: 140,
    priceCents: 4800,
    compareAtPriceCents: 5900,
    currency: "USD",
    pointsReward: 48,
    stripePriceId: null,
    reviewCount: 2,
    averageRating: 5,
    createdAt: new Date("2026-03-02T08:00:00.000Z"),
    updatedAt: new Date("2026-03-20T08:00:00.000Z")
  },
  {
    id: "prod_snail_cream",
    name: "Snail Mucin Cream",
    slug: "snail-mucin-cream",
    tagline: "Velvety moisture care that helps skin feel soothed and replenished.",
    category: "Moisturizer",
    shortDescription: "Comforting cream with a dewy, cushiony finish.",
    description:
      "Neatique Snail Mucin Cream helps replenish moisture while supporting a soft, healthy-looking finish. The formula is ideal when the skin barrier needs extra comfort without feeling heavy.",
    details:
      "Especially lovely for dry and sensitized skin.\nUse after serum to lock in moisture.\nCan be layered more generously as an overnight comfort cream.",
    imageUrl: getDefaultProductImageUrl("snail-mucin-cream") ?? "/products/snail-mucin-cream.svg",
    galleryImages: getLocalProductGallery("snail-mucin-cream"),
    featured: true,
    status: "ACTIVE",
    inventory: 110,
    priceCents: 4200,
    compareAtPriceCents: 5200,
    currency: "USD",
    pointsReward: 42,
    stripePriceId: null,
    createdAt: new Date("2026-03-03T08:00:00.000Z"),
    updatedAt: new Date("2026-03-20T08:00:00.000Z")
  },
  {
    id: "prod_snail_serum",
    name: "Snail Mucin Serum",
    slug: "snail-mucin-serum",
    tagline: "Daily hydration serum for soft-looking skin and lasting comfort.",
    category: "Hydration Serum",
    shortDescription: "A replenishing serum that layers easily under cream or SPF.",
    description:
      "Neatique Snail Mucin Serum is built for gentle hydration, softness, and daily bounce. Its fluid texture helps skin feel refreshed and cared for, making it an easy choice for morning or evening use.",
    details:
      "Great for dehydrated and easily stressed skin.\nUse on freshly cleansed skin.\nFollow with cream to complete the ritual.",
    imageUrl: getDefaultProductImageUrl("snail-mucin-serum") ?? "/products/snail-mucin-serum.svg",
    galleryImages: getLocalProductGallery("snail-mucin-serum"),
    featured: true,
    status: "ACTIVE",
    inventory: 135,
    priceCents: 3900,
    compareAtPriceCents: 4900,
    currency: "USD",
    pointsReward: 39,
    stripePriceId: null,
    createdAt: new Date("2026-03-04T08:00:00.000Z"),
    updatedAt: new Date("2026-03-20T08:00:00.000Z")
  }
];

export const fallbackPosts: BeautyPostRecord[] = [
  {
    id: "post_pdrn_intro",
    title: "What PDRN Skincare Is and Why It Is Everywhere Right Now",
    slug: "what-is-pdrn-skincare",
    excerpt:
      "A beginner-friendly breakdown of PDRN, its role in modern routines, and how to use it alongside hydrators and barrier creams.",
    category: "Ingredient Guide",
    readTime: 5,
    coverImageUrl: buildSiteImageUrl("blog", "PDRN Guide.png"),
    content:
      "PDRN has quickly become one of the most talked-about skin support ingredients in advanced routines. In topical skincare, people reach for PDRN-focused formulas when they want a routine that feels restorative, modern, and glow-forward.\n\nThe easiest way to use PDRN is by layering it after cleansing and before moisturizer. A serum gives quick hydration and slip, while a cream helps hold moisture in place.\n\nFor dry or tired-looking skin, pairing a PDRN serum with a richer cream can create a soft, supported finish. If your skin is easily overwhelmed, keep the rest of the routine simple and focus on hydration, barrier support, and sunscreen during the day.",
    seoTitle: "What Is PDRN Skincare? Benefits, Texture, and Routine Tips",
    seoDescription:
      "Learn what PDRN skincare is, who it suits, and how to use a PDRN serum or cream in a modern routine.",
    published: true,
    publishedAt: new Date("2026-03-18T09:00:00.000Z"),
    createdAt: new Date("2026-03-18T09:00:00.000Z"),
    updatedAt: new Date("2026-03-18T09:00:00.000Z")
  },
  {
    id: "post_snail_dry",
    title: "How to Build a Snail Mucin Routine for Dry, Dehydrated Skin",
    slug: "snail-mucin-routine-for-dry-skin",
    excerpt:
      "Use snail mucin to create a calm, cushiony routine that focuses on hydration, bounce, and visible comfort.",
    category: "Routine Tips",
    readTime: 4,
    coverImageUrl: buildSiteImageUrl("blog", "Snail Routine.png"),
    content:
      "Snail mucin routines are loved for their comforting, replenishing feel. If your skin often feels tight or flaky, start with a gentle cleanser, then apply a hydrating serum while the skin is still slightly damp.\n\nFollow with a cream that helps seal in moisture and reduce that dry, stretched feeling. During the day, finish with a sunscreen you enjoy wearing.\n\nAt night, you can keep the same steps and apply a slightly fuller layer of cream for extra comfort. The goal is consistency, not complexity.",
    seoTitle: "Snail Mucin Routine for Dry Skin: A Simple Layering Guide",
    seoDescription:
      "A simple, effective snail mucin skincare routine for dry or dehydrated skin, including layering tips for serum and cream.",
    published: true,
    publishedAt: new Date("2026-03-15T09:00:00.000Z"),
    createdAt: new Date("2026-03-15T09:00:00.000Z"),
    updatedAt: new Date("2026-03-15T09:00:00.000Z")
  },
  {
    id: "post_order_layering",
    title: "Serum vs Cream: Which One Does Your Routine Need First?",
    slug: "serum-vs-cream-routine-order",
    excerpt:
      "Not sure how to layer a serum and cream? Here is the easiest way to decide based on texture and skin goals.",
    category: "Skin School",
    readTime: 3,
    coverImageUrl: "/posts/serum-vs-cream.svg",
    content:
      "Serums usually go on first because they are lighter and designed to sit closer to the skin. Creams come after, creating a more comforting outer layer.\n\nIf your skin feels dehydrated, a serum can bring slip and lightweight moisture, while a cream helps the routine last longer. When in doubt, go from thinnest to richest texture.",
    seoTitle: "Serum vs Cream: The Best Layering Order for Healthy-Looking Skin",
    seoDescription:
      "Learn whether serum or cream comes first and how to layer skincare products for smoother, more hydrated skin.",
    published: true,
    publishedAt: new Date("2026-03-10T09:00:00.000Z"),
    createdAt: new Date("2026-03-10T09:00:00.000Z"),
    updatedAt: new Date("2026-03-10T09:00:00.000Z")
  }
];

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

export const fallbackReviews: ProductReviewRecord[] = [
  {
    id: "review_pdrn_1",
    rating: 5,
    title: "Silky texture and instant glow",
    content:
      "This serum feels elegant on the skin and gives a fresh, hydrated finish without feeling sticky.",
    displayName: "Emma R.",
    status: "PUBLISHED",
    verifiedPurchase: true,
    adminNotes: null,
    source: "CUSTOMER",
    productId: "prod_pdrn_serum",
    productName: "PDRN Serum",
    productSlug: "pdrn-serum",
    customerId: "cus_emma",
    customerEmail: "emma@example.com",
    orderId: "ord_1003",
    publishedAt: new Date("2026-03-23T09:00:00.000Z"),
    createdAt: new Date("2026-03-23T09:00:00.000Z"),
    updatedAt: new Date("2026-03-23T09:00:00.000Z")
  },
  {
    id: "review_pdrn_2",
    rating: 5,
    title: "Makes my routine look more polished",
    content:
      "I like how fast it layers with cream. Skin looks smoother and more luminous after a week of use.",
    displayName: "Ava M.",
    status: "PUBLISHED",
    verifiedPurchase: true,
    adminNotes: null,
    source: "CUSTOMER",
    productId: "prod_pdrn_serum",
    productName: "PDRN Serum",
    productSlug: "pdrn-serum",
    customerId: "cus_ava",
    customerEmail: "ava@neatiquebeauty.com",
    orderId: "ord_1001",
    publishedAt: new Date("2026-03-24T09:00:00.000Z"),
    createdAt: new Date("2026-03-24T09:00:00.000Z"),
    updatedAt: new Date("2026-03-24T09:00:00.000Z")
  }
];

export const fallbackSettings: StoreSettingsRecord = {
  shipping_region: "United States only",
  support_email: "support@neatiquebeauty.com",
  reward_rule: "1 point per $1 spent",
  stripe_mode: "Test mode until live keys are added",
  email_enabled: "false",
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: "false",
  smtp_user: "",
  smtp_pass: "",
  email_from_name: "Neatique Beauty",
  email_from_address: "",
  contact_recipient: ""
};

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
