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
    id: "prod_bee_venom_body_cream",
    productCode: "0009",
    productShortName: "Bee Venom Cream",
    amazonAsin: null,
    name: "Bee Venom Body Cream",
    slug: "bee-venom-body-cream",
    tagline:
      "A moisturizing body cream for dry, rough areas that leaves skin softer, smoother, and more comforted.",
    category: "Body Cream",
    shortDescription:
      "A bee venom and hyaluronic acid body cream designed for dry, rough, and uneven-looking skin on the body.",
    description:
      "Neatique Bee Venom Body Cream is a daily body cream made for arms, legs, neck, shoulders, and any area that feels dry, rough, or tight. Formulated with bee venom and hyaluronic acid, it helps deliver lasting hydration while supporting skin that looks smoother, softer, and healthier with regular use.",
    details:
      "Designed for dry, rough, and uneven-looking body skin including elbows, knees, calves, upper arms, neck, and shoulders.\nMade with bee venom and hyaluronic acid for lasting hydration and a smoother, more supple skin feel.\nUse after showering, before bed, or anytime skin feels dry and tight. The creamy texture absorbs smoothly without a greasy finish.",
    imageUrl:
      getDefaultProductImageUrl("bee-venom-body-cream") ??
      "/products/bee-venom-body-cream.svg",
    galleryImages: getLocalProductGallery("bee-venom-body-cream"),
    featured: false,
    status: "ACTIVE",
    inventory: 116,
    priceCents: 2299,
    compareAtPriceCents: 3999,
    currency: "USD",
    pointsReward: 23,
    stripePriceId: null,
    createdAt: new Date("2026-04-22T12:00:00.000Z"),
    updatedAt: new Date("2026-04-22T12:00:00.000Z")
  },
  {
    id: "prod_nad_collagen_serum",
    productCode: "0008",
    productShortName: "8+ NAD+ Serum",
    amazonAsin: null,
    name: "NAD+ Collagen Peptide Serum",
    slug: "nad-collagen-peptide-serum",
    tagline:
      "An AM-to-PM peptide serum designed for firmer-looking, smoother, hydrated skin with a fresh, polished finish.",
    category: "Peptide Serum",
    shortDescription:
      "A lightweight NAD+ and collagen peptide serum with niacinamide and hyaluronic acid for plump-looking hydration and overnight comfort.",
    description:
      "Neatique NAD+ Collagen Peptide Serum is built around an easy 8AM and 8PM routine concept: fresh, layer-friendly hydration in the morning and cushioned moisture-barrier comfort at night. Powered by NAD+, collagen peptides, and a multi-peptide blend, the formula is made for shoppers who want skin to look smoother, firmer, more elastic, and softly radiant without adding heaviness to the routine.",
    details:
      "Designed for an easy AM and PM routine with lightweight daytime hydration and richer overnight comfort.\nMade with NAD+, collagen peptides, niacinamide, and hyaluronic acid for smoother-looking, plumper-feeling skin.\nUse 2 to 3 pumps on face and neck after cleansing, then follow with moisturizer. Use SPF in the morning.",
    imageUrl:
      getDefaultProductImageUrl("nad-collagen-peptide-serum") ??
      "/products/nad-collagen-peptide-serum.svg",
    galleryImages: getLocalProductGallery("nad-collagen-peptide-serum"),
    featured: false,
    status: "ACTIVE",
    inventory: 124,
    priceCents: 2999,
    compareAtPriceCents: 3999,
    currency: "USD",
    pointsReward: 20,
    stripePriceId: null,
    createdAt: new Date("2026-04-22T08:00:00.000Z"),
    updatedAt: new Date("2026-04-22T08:00:00.000Z")
  },
  {
    id: "prod_nt16_serum",
    productCode: "0007",
    productShortName: "NT16",
    amazonAsin: null,
    name: "NT16 11% Niacinamide + 5% Tranexamic Serum",
    slug: "nt16-niacinamide-tranexamic-serum",
    tagline:
      "A daily niacinamide serum and tranexamic serum designed for a smoother, more even-looking finish.",
    category: "Niacinamide Serum",
    shortDescription:
      "A silky dark spot serum that supports a more even-looking tone, a smoother surface, and a cleaner daily finish.",
    description:
      "Neatique NT16 11% Niacinamide + 5% Tranexamic Serum is made for shoppers looking for a niacinamide serum and tranexamic serum in one elegant daily layer. The formula centers on niacinamide and tranexamic acid to support a more even-looking complexion, a smoother skin surface, and a refined finish that fits easily into morning and evening routines.",
    details:
      "Ideal for uneven-looking tone, post-blemish mark care, and clarity-focused daily routines.\nUse after cleansing and before moisturizer, morning or night.\nFollow with sunscreen during daytime use and pair with a cream when you want a softer, more cushioned final finish.",
    imageUrl:
      getDefaultProductImageUrl("nt16-niacinamide-tranexamic-serum") ??
      "/products/nt16-niacinamide-tranexamic-serum.svg",
    galleryImages: getLocalProductGallery("nt16-niacinamide-tranexamic-serum"),
    featured: false,
    status: "ACTIVE",
    inventory: 122,
    priceCents: 1899,
    compareAtPriceCents: 2999,
    currency: "USD",
    pointsReward: 19,
    stripePriceId: null,
    createdAt: new Date("2026-03-27T12:00:00.000Z"),
    updatedAt: new Date("2026-03-27T12:00:00.000Z")
  },
  {
    id: "prod_tnv3_serum",
    productCode: "0006",
    productShortName: "TNV3",
    amazonAsin: null,
    name: "TNV3 10% Tranexamic Acid + 2% Nicotinamide Serum + Vitamin C",
    slug: "tnv3-tranexamic-nicotinamide-serum",
    tagline:
      "A daily tranexamic serum built around tranexamic acid, nicotinamide, and vitamin C for a more even-looking finish.",
    category: "Tranexamic Serum",
    shortDescription:
      "A smooth daily serum designed for uneven-looking tone, post-blemish marks, and a cleaner, more even-looking skin finish.",
    description:
      "Neatique TNV3 10% Tranexamic Acid + 2% Nicotinamide Serum + Vitamin C is designed for shoppers looking for a tranexamic serum that feels elegant, layers easily, and supports a more even-looking complexion. The formula centers on tranexamic acid, nicotinamide, and vitamin C to help the skin look clearer, smoother, and more refined in daily routines.",
    details:
      "Ideal for uneven-looking tone, post-blemish mark care, and daily clarity-focused routines.\nUse after cleansing and before moisturizer, morning or night.\nFollow with sunscreen during daytime use and pair with a supportive cream when you want a more cushioned finish.",
    imageUrl:
      getDefaultProductImageUrl("tnv3-tranexamic-nicotinamide-serum") ??
      "/products/tnv3-tranexamic-nicotinamide-serum.svg",
    galleryImages: getLocalProductGallery("tnv3-tranexamic-nicotinamide-serum"),
    featured: false,
    status: "ACTIVE",
    inventory: 126,
    priceCents: 1799,
    compareAtPriceCents: 2999,
    currency: "USD",
    pointsReward: 18,
    stripePriceId: null,
    createdAt: new Date("2026-03-27T10:00:00.000Z"),
    updatedAt: new Date("2026-03-27T10:00:00.000Z")
  },
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
  "at13-arbutin-tranexamic-cream": {
    count: 61,
    ratings: [5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 4],
    titleHooks: [
      "This cream fits perfectly after serum",
      "My skin looks smoother around old marks",
      "Soft finish with a more even look",
      "Much easier to wear than heavier tone creams",
      "Clean under sunscreen and makeup",
      "One of the nicest daily creams I have tried"
    ],
    toneHooks: [
      "I wanted a cream that could sit comfortably over active serums.",
      "My skin can look uneven when I am not consistent with routine.",
      "I bought this for daytime use because I dislike heavy jars.",
      "I was trying to simplify my routine without losing that polished finish."
    ],
    texturePhrases: [
      "smooth and airy for a cream",
      "cushioned without turning greasy",
      "soft on contact and neat once it settles",
      "creamy enough for comfort but still elegant on skin"
    ],
    routinePhrases: [
      "after serum before SPF",
      "as the last step in my morning routine",
      "over hydrating layers on workdays",
      "morning and night when my skin looks uneven"
    ],
    resultPhrases: [
      "older post-blemish marks look less obvious in daylight",
      "my skin tone looks more even around the cheeks",
      "makeup sits cleaner over areas that usually look patchy",
      "the finish looks more settled by midday"
    ],
    comparisonPhrases: [
      "It feels more elegant than the tone creams I used before.",
      "Compared with gel creams, this gives more comfort without extra shine.",
      "It gives me a smoother finish than most daytime moisturizers.",
      "This one looks refined on skin instead of pasty."
    ],
    closingPhrases: [
      "I keep reaching for it because it makes mornings easier.",
      "This is the cream I would reorder for daily use.",
      "It made my routine feel more put together without extra steps.",
      "I like having this as my dependable final layer."
    ],
    variationTags: ["morning routine", "daily tone care", "under makeup", "easy layering"]
  },
  "nt16-niacinamide-tranexamic-serum": {
    count: 88,
    ratings: [5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5],
    titleHooks: [
      "This became my go-to niacinamide serum",
      "Refined finish without the chalky feel",
      "A steady serum for old marks and texture",
      "One bottle and my routine feels cleaner",
      "Very wearable for daytime",
      "My skin looks more even on camera"
    ],
    toneHooks: [
      "I wanted a niacinamide serum that did more than just sit on top of my skin.",
      "My old dark spot serum felt harsh, so I switched to this.",
      "I was looking for a tranexamic serum that could still feel polished every morning.",
      "My routine works best when one serum can handle both texture and uneven-looking tone."
    ],
    texturePhrases: [
      "sleek and quick to settle",
      "smooth with a soft serum slip",
      "lightweight with enough body to feel substantial",
      "clean and silky without leaving tack behind"
    ],
    routinePhrases: [
      "after cleansing and before moisturizer",
      "under sunscreen on most weekdays",
      "in both my morning and night routine",
      "as the first treatment step after toner"
    ],
    resultPhrases: [
      "the look of old spots is less distracting",
      "my T-zone looks smoother and calmer",
      "the overall tone of my face looks more even",
      "foundation catches less on the areas that used to look rough"
    ],
    comparisonPhrases: [
      "Compared with stronger niacinamide serums, this feels less harsh on my skin.",
      "It sits better under moisturizer than the last dark spot serum I bought.",
      "This one gives a cleaner finish than most treatment serums in my drawer.",
      "It feels more balanced than products that only focus on one ingredient."
    ],
    closingPhrases: [
      "This is the bottle I keep near the sink now.",
      "I would repurchase because it is easy to stay consistent with.",
      "It made my routine feel more reliable from day to day.",
      "I like how polished my skin looks when this is part of the routine."
    ],
    variationTags: ["tone upkeep", "oil balance", "workday routine", "smooth finish"]
  },
  "tnv3-tranexamic-nicotinamide-serum": {
    count: 76,
    ratings: [5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5],
    titleHooks: [
      "This serum made my routine feel more refined",
      "A dark spot serum that layers cleanly",
      "The texture is better than most treatment serums",
      "Easy to use under moisturizer",
      "A smoother look around old marks",
      "Very good balance of freshness and comfort"
    ],
    toneHooks: [
      "I bought this because I wanted tranexamic acid, nicotinamide, and vitamin C in one step.",
      "My routine gets cluttered fast, so I like formulas that do more than one job well.",
      "I was searching for a tranexamic serum that could fit easily into daytime use.",
      "Most dark spot serums I tried before felt sticky, and this one does not."
    ],
    texturePhrases: [
      "thin but not watery",
      "sleek and silky without drag",
      "fresh going on and tidy once absorbed",
      "light enough for layering but still comfortable"
    ],
    routinePhrases: [
      "right after cleansing before cream",
      "under SPF in the morning",
      "as my main serum on most days",
      "before moisturizer when my skin looks uneven"
    ],
    resultPhrases: [
      "older spots look softer around the edges",
      "my overall tone looks more even in mirror light",
      "my skin looks clearer across the cheeks",
      "makeup catches less on the areas that used to look uneven"
    ],
    comparisonPhrases: [
      "It layers better than my previous vitamin C serum.",
      "Compared with other dark spot serums, this one feels calmer on skin.",
      "It gives me a more polished finish than most clear serums I have tried.",
      "This feels more wearable in real life than formulas that stay tacky."
    ],
    closingPhrases: [
      "I would happily keep this in my regular rotation.",
      "It feels like a smart daily serum instead of a fussy treatment.",
      "This is easy to recommend if you want one serum to do more.",
      "I like that it makes my routine feel streamlined."
    ],
    variationTags: ["spot care", "daily serum", "under SPF", "smoother finish"]
  },
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
  "This ended up feeling more polished than the price suggests.",
  "I notice it most on days when my skin looks uneven.",
  "The formula is easier to keep using than stronger alternatives.",
  "It made the rest of my routine feel more balanced.",
  "This is the kind of product I keep within easy reach.",
  "I like that it feels purposeful without feeling complicated."
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
      content: `${tone} ${product.name} feels ${texture}. I use it ${routine}, and ${result}. ${closing}`
    },
    {
      title: `${titleHook} for ${variation}`,
      content: `After roughly two weeks, ${result}. ${tone} ${comparison} ${closing}`
    },
    {
      title: `${product.name} fits easily into my routine`,
      content: `I reach for ${product.name} ${routine}, especially ${lifestyle}. The texture is ${texture}. ${closing}`
    },
    {
      title: `Why I kept ${product.name}`,
      content: `${tone} ${comparison} ${product.name} feels ${texture}, and ${result}.`
    },
    {
      title: `The texture made me keep using this`,
      content: `What sold me first was the texture. ${product.name} feels ${texture}, wears well ${routine}, and ${result}.`
    },
    {
      title: `${product.name} on busy mornings`,
      content: `On busy mornings, I want something that behaves well without extra work. ${product.name} feels ${texture}, and ${result}. ${extraFinish}`
    },
    {
      title: `The difference shows up later in the day`,
      content: `The biggest difference for me shows up later in the day. ${tone} ${product.name} feels ${texture}, and ${result}. ${extraResult}.`
    },
    {
      title: `${product.name} earned a permanent spot`,
      content: `I kept rotating other products in and out, and this still kept its spot. ${product.name} feels ${texture}. ${comparison} ${closing}`
    },
    {
      title: `More refined than I expected`,
      content: `${opinion} ${tone} ${product.name} feels ${texture}, and ${result}.`
    },
    {
      title: `${variation} favorite`,
      content: `For ${variation}, this checks the boxes I care about most. ${product.name} feels ${texture}. ${comparison} ${closing}`
    },
    {
      title: `Simple, polished, and easy to use`,
      content: `Some days I want a routine that looks polished without feeling heavy. ${product.name} fits that really well ${routine}. ${result}. ${closing}`
    },
    {
      title: `${product.name} layers better than most`,
      content: `My favorite part is how easy this is to layer. ${tone} ${product.name} feels ${texture}. ${extraFinish} ${closing}`
    },
    {
      title: `One I actually finished`,
      content: `This was the one I kept finishing instead of letting it sit on a shelf. ${product.name} feels ${texture}, and ${result}. ${comparison}`
    },
    {
      title: `${titleHook} in real life`,
      content: `I noticed it most ${lifestyle}. ${product.name} wears nicely ${routine}, and ${result}. ${closing}`
    },
    {
      title: `Worth it for the texture`,
      content: `If texture matters to you, this one is easy to appreciate. ${product.name} feels ${texture}. ${extraFinish} ${closing}`
    },
    {
      title: `${product.name} keeps my routine looking neater`,
      content: `${tone} ${product.name} feels ${texture}. ${comparison} ${result}. ${closing}`
    },
    {
      title: `${titleHook} without extra fuss`,
      content: `I did not need to change the rest of my routine for this to work well. ${product.name} feels ${texture}, I use it ${routine}, and ${result}. ${closing}`
    },
    {
      title: `${product.name} feels easier to live with than most`,
      content: `I have tried enough products in this category to know when one is easy to keep using. ${comparison} ${product.name} feels ${texture}, and ${result}. ${closing}`
    },
    {
      title: `A quiet upgrade to my routine`,
      content: `${tone} ${product.name} feels ${texture}. ${extraFinish} ${result}. ${closing}`
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
    coverImageAlt: "Editorial skincare image introducing PDRN ingredients and routine layering.",
    previewImageUrl: null,
    previewImageGeneratedAt: null,
    previewImagePrompt: null,
    content:
      "PDRN has quickly become one of the most talked-about skin support ingredients in advanced routines. In topical skincare, people reach for PDRN-focused formulas when they want a routine that feels restorative, modern, and glow-forward.\n\nThe easiest way to use PDRN is by layering it after cleansing and before moisturizer. A serum gives quick hydration and slip, while a cream helps hold moisture in place.\n\nFor dry or tired-looking skin, pairing a PDRN serum with a richer cream can create a soft, supported finish. If your skin is easily overwhelmed, keep the rest of the routine simple and focus on hydration, barrier support, and sunscreen during the day.",
    seoTitle: "What Is PDRN Skincare? Benefits, Texture, and Routine Tips",
    seoDescription:
      "Learn what PDRN skincare is, who it suits, and how to use a PDRN serum or cream in a modern routine.",
    aiGenerated: false,
    focusKeyword: null,
    secondaryKeywords: [],
    imagePrompt: null,
    externalLinks: [],
    generatedAt: null,
    sourceProductId: null,
    sourceProductName: null,
    sourceProductSlug: null,
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
    coverImageAlt: "Snail mucin skincare routine editorial image with serum and cream styling.",
    previewImageUrl: null,
    previewImageGeneratedAt: null,
    previewImagePrompt: null,
    content:
      "Snail mucin routines are loved for their comforting, replenishing feel. If your skin often feels tight or flaky, start with a gentle cleanser, then apply a hydrating serum while the skin is still slightly damp.\n\nFollow with a cream that helps seal in moisture and reduce that dry, stretched feeling. During the day, finish with a sunscreen you enjoy wearing.\n\nAt night, you can keep the same steps and apply a slightly fuller layer of cream for extra comfort. The goal is consistency, not complexity.",
    seoTitle: "Snail Mucin Routine for Dry Skin: A Simple Layering Guide",
    seoDescription:
      "A simple, effective snail mucin skincare routine for dry or dehydrated skin, including layering tips for serum and cream.",
    aiGenerated: false,
    focusKeyword: null,
    secondaryKeywords: [],
    imagePrompt: null,
    externalLinks: [],
    generatedAt: null,
    sourceProductId: null,
    sourceProductName: null,
    sourceProductSlug: null,
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
    coverImageAlt: "Minimal editorial image comparing serum and cream layering order.",
    previewImageUrl: null,
    previewImageGeneratedAt: null,
    previewImagePrompt: null,
    content:
      "Serums usually go on first because they are lighter and designed to sit closer to the skin. Creams come after, creating a more comforting outer layer.\n\nIf your skin feels dehydrated, a serum can bring slip and lightweight moisture, while a cream helps the routine last longer. When in doubt, go from thinnest to richest texture.",
    seoTitle: "Serum vs Cream: The Best Layering Order for Healthy-Looking Skin",
    seoDescription:
      "Learn whether serum or cream comes first and how to layer skincare products for smoother, more hydrated skin.",
    aiGenerated: false,
    focusKeyword: null,
    secondaryKeywords: [],
    imagePrompt: null,
    externalLinks: [],
    generatedAt: null,
    sourceProductId: null,
    sourceProductName: null,
    sourceProductSlug: null,
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
  contact_recipient: "",
  imap_host: "",
  imap_port: "993",
  imap_secure: "true",
  imap_user: "",
  imap_pass: "",
  imap_mailbox: "INBOX",
  brevo_enabled: "false",
  brevo_sync_subscribe: "true",
  brevo_sync_contact: "false",
  brevo_sync_customers: "true",
  brevo_sender_name: "Neatique Beauty",
  brevo_sender_email: "",
  brevo_reply_to: "",
  brevo_test_email: "",
  brevo_subscribers_list_id: "",
  brevo_contact_list_id: "",
  brevo_customers_list_id: "",
  ai_post_enabled: "false",
  ai_post_cadence_days: "2",
  ai_post_auto_publish: "false",
  ai_post_include_external_links: "true",
  ai_post_last_run_at: "",
  ai_post_last_status: "",
  ai_post_last_post_id: "",
  ai_post_rotation_cursor: ""
};
