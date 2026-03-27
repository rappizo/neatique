import type { BeautyPostRecord, ProductRecord, ProductReviewRecord, StoreSettingsRecord } from "@/lib/types";
import { getDefaultProductImageUrl, getLocalProductGallery } from "@/lib/product-media";
import { buildSiteImageUrl } from "@/lib/site-media";

type BaseProduct = Omit<ProductRecord, "reviewCount" | "averageRating">;

type ReviewPlan = {
  count: number;
  ratings: number[];
  titleHooks: string[];
  toneHooks: string[];
  texturePhrases: string[];
  routinePhrases: string[];
  resultPhrases: string[];
  comparisonPhrases: string[];
  closingPhrases: string[];
  variationTags: string[];
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
    id: "prod_at13_cream",
    productCode: "0005",
    productShortName: "AT13",
    amazonAsin: null,
    name: "AT13 8% Arbutin + 5% Tranexamic Cream",
    slug: "at13-arbutin-tranexamic-cream",
    tagline: "A tone-correcting daily cream made to support a brighter, more even-looking finish.",
    category: "Brightening Cream",
    shortDescription: "A silky daily cream with 8% arbutin and 5% tranexamic acid for a calm, refined glow.",
    description:
      "Neatique AT13 8% Arbutin + 5% Tranexamic Cream is designed for shoppers who want a daily brightening moisturizer that still feels elegant and comfortable on skin. The cream melts in with a smooth, soft finish while supporting a look that feels clearer, more even, and more polished over time.",
    details:
      "Ideal for tone-evening and daily brightening routines.\nUse after serum as the final cream step, morning or night.\nPairs well with hydration-focused serums when you want brightness without sacrificing comfort.",
    imageUrl: getDefaultProductImageUrl("at13-arbutin-tranexamic-cream") ?? "/products/at13-arbutin-tranexamic-cream.svg",
    galleryImages: getLocalProductGallery("at13-arbutin-tranexamic-cream"),
    featured: false,
    status: "ACTIVE",
    inventory: 118,
    priceCents: 2499,
    compareAtPriceCents: 3999,
    currency: "USD",
    pointsReward: 25,
    stripePriceId: null,
    createdAt: new Date("2026-03-26T08:00:00.000Z"),
    updatedAt: new Date("2026-03-27T08:00:00.000Z")
  },
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
    titleHooks: [
      "Softer mornings with this cream",
      "Comfort that still looks polished",
      "This finished my routine perfectly",
      "The texture surprised me in a good way",
      "A calm glow without heavy residue",
      "Much easier to wear than rich creams"
    ],
    toneHooks: [
      "I bought this during a week my skin barrier felt stressed.",
      "I was looking for a cream that felt luxurious but not greasy.",
      "My skin gets tight quickly when weather changes.",
      "I wanted something that looked elegant under makeup on workdays."
    ],
    texturePhrases: [
      "creamy at first and then smooth once it settles",
      "plush while applying, then light after two minutes",
      "silky with a dense feel that never turns waxy",
      "rich enough for dry patches but still refined"
    ],
    routinePhrases: [
      "as the final step at night",
      "after PDRN serum in the evening",
      "before sunscreen when my skin feels dry",
      "in a simple three-step routine"
    ],
    resultPhrases: [
      "my cheeks look calmer when I wake up",
      "the rough texture near my jaw looks smoother",
      "my skin keeps that rested look into the afternoon",
      "I feel less dryness around my nose and mouth"
    ],
    comparisonPhrases: [
      "It performs better than most thick creams I used last year.",
      "Compared with my previous moisturizer, this one sits cleaner on skin.",
      "It gives comfort without the shiny layer I usually dislike.",
      "It feels more premium than many creams in this price range."
    ],
    closingPhrases: [
      "I keep this on my vanity because it is reliable.",
      "I would repurchase for the finish alone.",
      "This made my routine feel upgraded without adding steps.",
      "For dry evenings, this is the jar I reach for."
    ],
    variationTags: ["night routine", "barrier comfort", "daily finish", "soft glow"]
  },
  "pdrn-serum": {
    count: 94,
    ratings: [5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5],
    titleHooks: [
      "This became my main daytime serum",
      "A cleaner glow than other brightening serums",
      "Layers beautifully under cream and SPF",
      "Silky texture with a refined finish",
      "My skin looks brighter without stickiness",
      "Easy serum to stay consistent with"
    ],
    toneHooks: [
      "I tested this in the morning before commuting.",
      "I wanted something light enough for humid days.",
      "My old serum pilled under sunscreen so I switched.",
      "I looked for a formula that felt polished, not syrupy."
    ],
    texturePhrases: [
      "fluid and silky with almost no tack",
      "lightweight but still hydrating enough for my dry zones",
      "quick-absorbing with a polished slip",
      "fresh on contact and easy to spread"
    ],
    routinePhrases: [
      "right after cleansing",
      "before moisturizer in both AM and PM",
      "as my first treatment layer",
      "under sunscreen every weekday"
    ],
    resultPhrases: [
      "my skin tone looks more even in photos",
      "my face looks fresher at the end of the day",
      "I notice a smoother reflection on the high points",
      "my complexion appears less dull by afternoon"
    ],
    comparisonPhrases: [
      "It gives better glow than my old niacinamide blend.",
      "Compared with heavier serums, this one wears more elegantly.",
      "It is one of the few glow serums that does not pill for me.",
      "I get brightness without that sticky film."
    ],
    closingPhrases: [
      "This one is staying in my routine.",
      "I plan to keep using it through summer.",
      "Very easy to recommend if you like lightweight textures.",
      "It is now my default serum step."
    ],
    variationTags: ["daytime use", "under SPF", "light texture", "glow step"]
  },
  "snail-mucin-cream": {
    count: 83,
    ratings: [5, 5, 4, 5, 4, 5, 5, 5, 4, 5, 5],
    titleHooks: [
      "A dependable comfort cream for dry nights",
      "Dewy but still neat on my skin",
      "This helped my flaky areas quickly",
      "The overnight feel is excellent",
      "Comforting texture without heaviness",
      "A better night cream than expected"
    ],
    toneHooks: [
      "I used this during a week of indoor heating and dry air.",
      "My skin tends to look flat at night, so I wanted more cushion.",
      "I needed a comfort cream after over-exfoliating.",
      "I looked for a formula that felt rich but not suffocating."
    ],
    texturePhrases: [
      "soft and cushiony with a dewy touch",
      "richer than a gel cream but still smooth",
      "nourishing while staying clean on the surface",
      "velvety and easy to spread over serum"
    ],
    routinePhrases: [
      "before bed as the final layer",
      "after snail serum when my skin feels tight",
      "in my evening routine on colder days",
      "as a comfort step after showering"
    ],
    resultPhrases: [
      "my skin looks less flaky by morning",
      "dry patches around my chin stay softer",
      "I wake up with a fuller and calmer finish",
      "my face feels more comfortable overnight"
    ],
    comparisonPhrases: [
      "It works better than the thicker jar cream I used before.",
      "Compared with my old night cream, this feels less greasy.",
      "It gives me dew without turning oily.",
      "This one keeps moisture longer than lighter creams."
    ],
    closingPhrases: [
      "I now keep this for every dry evening.",
      "The comfort level is the big win for me.",
      "I would buy this again for winter routines.",
      "This made my evening routine feel complete."
    ],
    variationTags: ["overnight", "dry skin", "comfort layer", "dewy finish"]
  },
  "snail-mucin-serum": {
    count: 57,
    ratings: [5, 4, 5, 4, 5, 5, 4, 5, 4, 5],
    titleHooks: [
      "Simple hydration that works every day",
      "A light serum that still feels effective",
      "Fresh, bouncy, and easy to layer",
      "Hydration without the sticky finish",
      "Great first step after cleansing",
      "This keeps my skin comfortable all day"
    ],
    toneHooks: [
      "I wanted a daily serum that would not feel heavy.",
      "My skin gets dehydrated fast in air conditioning.",
      "I switched to this because my old serum felt tacky.",
      "I needed a quick morning step before moisturizer."
    ],
    texturePhrases: [
      "watery-light and very easy to spread",
      "bouncy at first and smooth afterward",
      "fresh with almost no residue",
      "fluid enough to layer without pilling"
    ],
    routinePhrases: [
      "right after cleansing",
      "before moisturizer every morning",
      "as the first hydrating layer",
      "under both cream and sunscreen"
    ],
    resultPhrases: [
      "my skin feels less tight during long workdays",
      "the rest of my routine sits more smoothly",
      "my face looks fresher by mid-day",
      "I notice a cleaner, calmer hydration finish"
    ],
    comparisonPhrases: [
      "It feels lighter than most hydrating serums I have tried.",
      "Compared with thicker formulas, this one layers much better.",
      "I get comfort without the sticky feeling.",
      "It is easier to use daily than my previous serum."
    ],
    closingPhrases: [
      "A very practical serum for everyday routines.",
      "This has become my baseline hydration step.",
      "I like how low-effort and reliable it feels.",
      "I would recommend it for simple routines."
    ],
    variationTags: ["morning layer", "fresh texture", "daily hydration", "easy routine"]
  }
};

const reviewLifestyleHooks = [
  "on rushed weekdays",
  "during dry weather",
  "after late nights",
  "under makeup",
  "after showering",
  "while traveling",
  "on minimal-routine days",
  "when my skin looks tired"
];

const reviewFinishHooks = [
  "The finish stays neat instead of greasy.",
  "It gives a soft glow without looking shiny.",
  "It sits comfortably under the rest of my routine.",
  "It looks polished rather than heavy.",
  "It keeps my skin looking fresh for longer.",
  "It wears more elegantly than I expected."
];

const reviewOpinionHooks = [
  "My honest take: this was easier to like than I expected.",
  "This ended up feeling more polished than the price suggests.",
  "I notice it most when my skin is having an off day.",
  "It made my routine feel more consistent overall.",
  "This is the kind of formula I keep close by.",
  "I like that it feels effective without being fussy."
];

function seededFloat(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function pickVariant(values: string[], seed: number) {
  return values[Math.floor(seededFloat(seed) * values.length) % values.length];
}

function buildReviewDate(productSlug: string, index: number) {
  const now = new Date();
  const seed = productSlug.length * 97 + index * 131 + 17;
  const minutesBack = Math.floor(seededFloat(seed + 1) * 180 * 24 * 60);
  const date = new Date(now.getTime() - minutesBack * 60 * 1000);

  const roundedMinutes = Math.floor(date.getUTCMinutes() / 5) * 5;
  date.setUTCMinutes(roundedMinutes, 0, 0);
  return date;
}

function buildUniqueReviewCopy(product: BaseProduct, plan: ReviewPlan, index: number, seen: Set<string>) {
  const baseSeed = product.slug.length * 1000 + index * 17 + 9;
  const titleHook = pickVariant(plan.titleHooks, baseSeed + 3);
  const tone = pickVariant(plan.toneHooks, baseSeed + 7);
  const texture = pickVariant(plan.texturePhrases, baseSeed + 11);
  const routine = pickVariant(plan.routinePhrases, baseSeed + 13);
  const result = pickVariant(plan.resultPhrases, baseSeed + 19);
  const comparison = pickVariant(plan.comparisonPhrases, baseSeed + 23);
  const closing = pickVariant(plan.closingPhrases, baseSeed + 29);
  const variation = pickVariant(plan.variationTags, baseSeed + 31);
  const lifestyle = pickVariant(reviewLifestyleHooks, baseSeed + 37);
  const extraFinish = pickVariant(reviewFinishHooks, baseSeed + 41);
  const opinion = pickVariant(reviewOpinionHooks, baseSeed + 43);
  const extraResult = pickVariant(plan.resultPhrases, baseSeed + 47);
  const modes = [
    {
      title: `${titleHook}`,
      content: `First impression: ${product.name} felt ${texture}. ${tone} Using it ${routine}, ${result}. ${closing}`
    },
    {
      title: `${titleHook} for ${variation}`,
      content: `Two weeks in, the main thing I notice is this: ${result}. ${tone} ${comparison} ${closing}`
    },
    {
      title: `${product.name}: ${titleHook.toLowerCase()}`,
      content: `Short version: ${product.name} is ${texture}. I reach for it ${routine}, especially ${lifestyle}. ${closing}`
    },
    {
      title: `Why I kept ${product.name}`,
      content: `${tone} That is what made me try ${product.name}. What stood out quickly was how ${texture} it feels and how ${result}. ${comparison}`
    },
    {
      title: `${product.name} surprised me`,
      content: `My skin usually tells me right away when something is too much, but this one landed nicely. ${product.name} feels ${texture}, and ${result}. ${extraFinish} ${closing}`
    },
    {
      title: `Worth it for the texture`,
      content: `The texture sold me first. ${product.name} is ${texture}, sits well ${routine}, and ${result}.`
    },
    {
      title: `Better than expected`,
      content: `Honestly, I expected this to be just okay. Instead, ${product.name} feels ${texture}, looks more refined on skin, and ${result}. ${closing}`
    },
    {
      title: `${product.name} on busy mornings`,
      content: `On busy mornings, I want something that behaves well without extra work. ${product.name} feels ${texture}, wears nicely ${routine}, and ${result}. ${comparison}`
    },
    {
      title: `A calm finish without heaviness`,
      content: `At night, comfort matters more to me than anything else. ${tone} ${product.name} feels ${texture}, and ${result}. ${closing}`
    },
    {
      title: `${product.name} after a few weeks`,
      content: `After a few weeks, the consistency is what kept me using ${product.name}. ${comparison} ${result}. ${closing}`
    },
    {
      title: `If you care about texture`,
      content: `If you care about texture, this one is easy to appreciate. ${product.name} feels ${texture}. ${extraFinish} ${closing}`
    },
    {
      title: `${titleHook} - honest review`,
      content: `${opinion} ${tone} ${product.name} feels ${texture}, and ${result}. ${comparison}`
    },
    {
      title: `The difference showed up later`,
      content: `The difference showed up most in how my skin looked later in the day. ${tone} ${product.name} feels ${texture}, and ${result}. ${extraResult}.`
    },
    {
      title: `${product.name} kept earning a spot`,
      content: `I kept rotating this with other products and still came back to it. ${tone} ${product.name} feels ${texture}, and ${result}. ${closing}`
    },
    {
      title: `Routine note on ${product.name}`,
      content: `Routine note: I use ${product.name} ${routine}. ${tone} The texture feels ${texture}, and ${result}. ${extraFinish}`
    },
    {
      title: `${titleHook} for real life`,
      content: `For real life, this just works. ${tone} ${product.name} feels ${texture}, looks elegant on skin, and ${result}. ${closing}`
    }
  ];
  const startIndex = Math.floor(seededFloat(baseSeed + 53) * modes.length) % modes.length;

  for (let attempt = 0; attempt < modes.length + 4; attempt += 1) {
    const mode = modes[(startIndex + attempt) % modes.length];
    const nextTitle =
      attempt < modes.length ? mode.title : `${mode.title} (${variation} ${attempt - modes.length + 1})`;
    const nextContent =
      attempt < modes.length
        ? mode.content
        : `${mode.content} I also like it for ${variation} days because it keeps my routine consistent.`;
    const signature = `${nextTitle}\n${nextContent}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      return {
        title: nextTitle,
        content: nextContent
      };
    }
  }

  const fallbackTitle = `${titleHook} ${index + 1}`;
  const fallbackContent = `${tone} ${product.name} feels ${texture}. ${result}. ${closing}`;
  seen.add(`${fallbackTitle}\n${fallbackContent}`);

  return {
    title: fallbackTitle,
    content: fallbackContent
  };
}

function buildProductReviews(product: BaseProduct): ProductReviewRecord[] {
  const plan = reviewPlans[product.slug];

  if (!plan || plan.count <= 0) {
    return [];
  }

  const seen = new Set<string>();

  return Array.from({ length: plan.count }, (_, index) => {
    const rating = plan.ratings[index % plan.ratings.length];
    const reviewDate = buildReviewDate(product.slug, index);
    const reviewCopy = buildUniqueReviewCopy(product, plan, index, seen);

    return {
      id: `sample-review-${product.slug}-${index + 1}`,
      rating,
      title: reviewCopy.title,
      content: reviewCopy.content,
      displayName: buildDisplayName(index + product.slug.length),
      reviewDate,
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
      publishedAt: reviewDate,
      createdAt: reviewDate,
      updatedAt: reviewDate
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
