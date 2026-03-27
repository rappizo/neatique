import type { BeautyPostRecord, ProductRecord, ProductReviewRecord, StoreSettingsRecord } from "@/lib/types";
import { getDefaultProductImageUrl, getLocalProductGallery } from "@/lib/product-media";
import { buildSiteImageUrl } from "@/lib/site-media";

type BaseProduct = Omit<ProductRecord, "reviewCount" | "averageRating">;

type ReviewPlan = {
  count: number;
  ratings: number[];
  texturePhrases: string[];
  finishPhrases: string[];
  timingPhrases: string[];
  resultPhrases: string[];
  titlePhrases: string[];
};

const firstNames = [
  "Olivia",
  "Emma",
  "Sophia",
  "Ava",
  "Isabella",
  "Mia",
  "Charlotte",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Ella",
  "Scarlett",
  "Grace",
  "Lily",
  "Chloe",
  "Victoria",
  "Layla",
  "Nora",
  "Zoey",
  "Hannah",
  "Aria",
  "Penelope",
  "Riley",
  "Mila",
  "Stella",
  "Lucy",
  "Hazel",
  "Sofia",
  "Ellie",
  "Madison",
  "Camila",
  "Avery",
  "Aurora",
  "Naomi",
  "Elena",
  "Sadie",
  "Clara",
  "Alice",
  "Julia"
];

const lastInitials = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function buildDisplayName(index: number) {
  const firstName = firstNames[index % firstNames.length];
  const lastInitial = lastInitials[(index * 7 + 3) % lastInitials.length];
  return `${firstName} ${lastInitial}.`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

const baseProducts: BaseProduct[] = [
  {
    id: "prod_pdrn_cream",
    productCode: "0001",
    productShortName: "PDRN Cream",
    amazonAsin: null,
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
    productCode: "0002",
    productShortName: "PDRN5+ Serum",
    amazonAsin: null,
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
    createdAt: new Date("2026-03-02T08:00:00.000Z"),
    updatedAt: new Date("2026-03-20T08:00:00.000Z")
  },
  {
    id: "prod_snail_cream",
    productCode: "0003",
    productShortName: "SC93 Snail Mucin Cream",
    amazonAsin: null,
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
    productCode: "0004",
    productShortName: "SE96 Snail Mucin Serum",
    amazonAsin: null,
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

const reviewPlans: Record<string, ReviewPlan> = {
  "pdrn-cream": {
    count: 68,
    ratings: [5, 5, 4, 5, 5, 4, 5, 5, 4, 5],
    texturePhrases: ["rich yet smooth", "plush and comfortable", "nourishing but refined"],
    finishPhrases: ["soft and cushioned", "healthy-looking and calm", "velvety and comforted"],
    timingPhrases: ["as the last step of my night routine", "after serum in the evening", "before SPF in the morning"],
    resultPhrases: ["less tight by the end of the day", "much more comfortable overnight", "more rested and balanced overall"],
    titlePhrases: [
      "Comforting without feeling heavy",
      "My skin feels softer by morning",
      "Such a pretty cream texture",
      "A really lovely finish",
      "Looks smoother and calmer",
      "Great final step for dry days"
    ]
  },
  "pdrn-serum": {
    count: 94,
    ratings: [5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5],
    texturePhrases: ["silky and lightweight", "smooth with a polished slip", "light but still hydrating"],
    finishPhrases: ["fresh and glowy", "smooth and radiant", "bright and refined"],
    timingPhrases: ["right after cleansing", "before cream in the morning", "morning and night under moisturizer"],
    resultPhrases: ["more luminous after a week", "more even and polished", "refreshed without any stickiness"],
    titlePhrases: [
      "This is the one I keep reaching for",
      "Glowy but still elegant",
      "Makes my routine feel expensive",
      "Beautiful under the rest of my skincare",
      "Gives me that smooth finish",
      "Exactly the texture I wanted"
    ]
  },
  "snail-mucin-cream": {
    count: 83,
    ratings: [5, 5, 4, 5, 4, 5, 5, 5, 4, 5, 5],
    texturePhrases: ["cushiony and comforting", "soft and plush", "rich with a dewy touch"],
    finishPhrases: ["dewy and supple", "comfortable and smooth", "plump and well-moisturized"],
    timingPhrases: ["to seal everything in at night", "after serum whenever my skin feels dry", "as my comfort cream in the evening"],
    resultPhrases: ["much more replenished the next morning", "less flaky around dry areas", "soft and calm for hours"],
    titlePhrases: [
      "So comforting at night",
      "Dewy without looking greasy",
      "A great comfort cream",
      "Makes dry skin feel much happier",
      "Softens everything right away",
      "Really nice for overnight use"
    ]
  },
  "snail-mucin-serum": {
    count: 57,
    ratings: [5, 4, 5, 4, 5, 5, 4, 5, 4, 5],
    texturePhrases: ["light, bouncy, and easy to spread", "fluid and fresh", "smooth and watery-light"],
    finishPhrases: ["hydrated and calm", "soft and refreshed", "dewy in a very easy way"],
    timingPhrases: ["under moisturizer in the morning", "after cleansing when my skin feels dry", "as my first hydrating layer"],
    resultPhrases: ["more comfortable through the day", "smoother under the rest of my routine", "less dull by the afternoon"],
    titlePhrases: [
      "Easy to use every day",
      "A very nice light serum",
      "Hydrating but not sticky",
      "Simple and really reliable",
      "Great under moisturizer",
      "Keeps my skin feeling fresh"
    ]
  }
};

function buildReviewTitle(productSlug: string, index: number) {
  const plan = reviewPlans[productSlug];
  return plan.titlePhrases[index % plan.titlePhrases.length];
}

function buildReviewBody(product: BaseProduct, plan: ReviewPlan, index: number) {
  const texture = plan.texturePhrases[index % plan.texturePhrases.length];
  const finish = plan.finishPhrases[(index * 2) % plan.finishPhrases.length];
  const timing = plan.timingPhrases[(index * 3) % plan.timingPhrases.length];
  const result = plan.resultPhrases[(index * 5) % plan.resultPhrases.length];

  const shortBody = `${product.name} feels ${texture} and leaves my skin looking ${finish}. It fits into my routine very easily.`;
  const mediumBody = `I have been using ${product.name} ${timing}, and the ${texture} texture makes it so easy to stay consistent with. My skin looks ${finish} and feels ${result}.`;
  const longBody = `I started using ${product.name} ${timing}, and it immediately felt like one of the easiest products in my routine to keep coming back to. The texture is ${texture}, so it layers well without making everything feel too heavy. After a little consistent use, my skin looks ${finish} and feels ${result}, which is exactly what I was hoping for.`;

  if (index % 5 === 0) {
    return longBody;
  }

  if (index % 2 === 0) {
    return mediumBody;
  }

  return shortBody;
}

function buildProductReviews(product: BaseProduct): ProductReviewRecord[] {
  const plan = reviewPlans[product.slug];

  return Array.from({ length: plan.count }, (_, index) => {
    const rating = plan.ratings[index % plan.ratings.length];
    const publishedAt = new Date(Date.UTC(2026, (index % 6), ((index * 3) % 27) + 1, 9, 0, 0));

    return {
      id: `sample-review-${product.slug}-${index + 1}`,
      rating,
      title: buildReviewTitle(product.slug, index),
      content: buildReviewBody(product, plan, index),
      displayName: buildDisplayName(index + product.slug.length),
      status: "PUBLISHED",
      verifiedPurchase: index % 4 !== 0,
      adminNotes: null,
      source: "ADMIN_IMPORT",
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      customerId: null,
      customerEmail: null,
      orderId: null,
      publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt
    };
  });
}

export const sampleReviews: ProductReviewRecord[] = baseProducts.flatMap(buildProductReviews);

export const sampleProducts: ProductRecord[] = baseProducts.map((product) => {
  const productReviews = sampleReviews.filter((review) => review.productId === product.id);
  const productAverageRating = average(productReviews.map((review) => review.rating));

  return {
    ...product,
    reviewCount: productReviews.length,
    averageRating: productAverageRating
  };
});

export const samplePosts: BeautyPostRecord[] = [
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

export const sampleStoreSettings: StoreSettingsRecord = {
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
