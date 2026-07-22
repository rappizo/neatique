export type CollectionDefinition = {
  slug: string;
  shortTitle: string;
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  productSlugs: string[];
  contextProductSlugs?: string[];
  guideSlugs: string[];
  introduction: string[];
  choosingGuide: Array<{ title: string; body: string }>;
  routineSteps: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export const COLLECTIONS: CollectionDefinition[] = [
  {
    slug: "pdrn-skincare",
    shortTitle: "PDRN Skincare",
    title: "PDRN Skincare for a Hydrated, Smoother-Looking Routine",
    description:
      "Compare Neatique PDRN cleanser, serum and cream textures, then build a simple PDRN skincare routine around hydration, comfort and a polished-looking finish.",
    primaryKeyword: "PDRN skincare",
    secondaryKeywords: ["PDRN serum and cream", "PDRN skincare routine", "PDRN cleanser"],
    productSlugs: ["pdrn-cleanser", "pdrn-serum", "pdrn-cream"],
    guideSlugs: [
      "how-to-layer-pdrn-serum-and-cream-without-pilling",
      "how-to-use-pdrn-cleanser-without-tightness",
      "what-is-pdrn-skincare",
      "pdrn-peptide-serum-guide-smooth-hydrated-skin",
      "how-to-use-pdrn-cream-for-a-calm-hydrated-skin-routine"
    ],
    introduction: [
      "PDRN skincare can appear in several routine steps, so the useful question is not simply which product contains the ingredient. It is which texture and step your routine actually needs. A cleanser is a rinse-off first step, a serum adds a light leave-on layer, and a cream finishes the routine with a more cushioning feel.",
      "This collection keeps those roles separate so you can compare them without treating every PDRN product as interchangeable. Start with the texture you are most likely to use consistently, then add another step only when it solves a distinct routine need."
    ],
    choosingGuide: [
      { title: "Choose the cleanser for the first step", body: "Use the whip cleanser when you want a creamy daily wash before leave-on skincare. Follow with the serum or cream rather than expecting a rinse-off step to replace them." },
      { title: "Choose the serum for light layering", body: "The serum suits routines that need a thin hydration layer under moisturizer or sunscreen without adding the weight of another cream." },
      { title: "Choose the cream for the finishing layer", body: "The cream is the more cushioning option for dry or dehydrated-feeling skin and works as the final moisturizer step after serum." }
    ],
    routineSteps: [
      { title: "1. Cleanse", body: "Massage the cleanser over damp skin and rinse, following the directions on the product packaging." },
      { title: "2. Apply serum", body: "Smooth a small amount of serum over clean skin and allow the layer to settle before the next product." },
      { title: "3. Moisturize", body: "Finish with cream where your routine needs more comfort, then use sunscreen during the day." }
    ],
    faqs: [
      { question: "Do I need both PDRN serum and cream?", answer: "No. The serum provides a lighter leave-on layer and the cream provides a richer finishing step. Choose one or use both based on texture preference and how dry your skin feels." },
      { question: "Can PDRN skincare be used morning and night?", answer: "These products are positioned for daily routines, but follow the individual packaging directions and introduce one new product at a time if your skin is easily reactive." }
    ]
  },
  {
    slug: "snail-mucin-skincare",
    shortTitle: "Snail Mucin Skincare",
    title: "Snail Mucin Skincare for Lightweight and Cushioning Hydration",
    description:
      "Compare Neatique snail mucin serum and cream, learn where each texture fits, and build a straightforward hydration routine for dry or dehydrated-feeling skin.",
    primaryKeyword: "snail mucin skincare",
    secondaryKeywords: ["snail mucin serum", "snail mucin cream", "snail mucin routine"],
    productSlugs: ["snail-mucin-serum", "snail-mucin-cream"],
    guideSlugs: [
      "how-to-use-snail-mucin-serum-hydration-routine",
      "snail-mucin-cream-moisturizer-routine"
    ],
    introduction: [
      "Snail mucin products are often grouped together even though serum and cream play different roles. The serum is the fluid step: it layers after cleansing and before moisturizer. The cream is the finishing step: it adds a more cushiony feel and helps complete the routine.",
      "Comparing the two by texture is more useful than choosing by ingredient name alone. If you already own a moisturizer you like, begin with the serum. If your main need is a more comfortable final layer, begin with the cream."
    ],
    choosingGuide: [
      { title: "For a lighter routine", body: "Choose the 96% snail mucin serum when you want a fluid hydration layer that can sit beneath an existing moisturizer." },
      { title: "For a more cushiony finish", body: "Choose the snail mucin cream when your routine needs a moisturizer with a softer, dewier-feeling finish." },
      { title: "For a layered routine", body: "Use serum first and cream second. Keeping the thinner-to-thicker order makes the roles of both products easy to understand." }
    ],
    routineSteps: [
      { title: "1. Start on clean skin", body: "Use your normal gentle cleanser and pat away excess water without rubbing." },
      { title: "2. Add the serum if needed", body: "Apply the fluid layer before cream and give it a moment to settle." },
      { title: "3. Seal with cream", body: "Use the cream as the moisturizer step and finish daytime routines with sunscreen." }
    ],
    faqs: [
      { question: "Is snail mucin serum the same as snail mucin cream?", answer: "No. They share a snail mucin focus but have different textures and routine positions. Serum goes before moisturizer; cream is the moisturizer step." },
      { question: "Should I patch test snail mucin skincare?", answer: "Patch testing is a sensible step for any unfamiliar cosmetic, especially if you have known sensitivities. Stop use if irritation occurs and seek professional advice when needed." }
    ]
  },
  {
    slug: "uneven-tone-serums",
    shortTitle: "Uneven-Tone Serums",
    title: "Serums for Uneven-Looking Tone and Post-Blemish Mark Care",
    description:
      "Compare Neatique niacinamide, tranexamic acid, vitamin C, turmeric and kojic acid serum options for a more even-looking, refined skincare finish.",
    primaryKeyword: "serum for uneven-looking tone",
    secondaryKeywords: ["tranexamic acid serum", "niacinamide serum", "post-blemish mark serum"],
    productSlugs: [
      "tnv3-tranexamic-nicotinamide-serum",
      "nt16-niacinamide-tranexamic-serum",
      "kit9-niacinamide-turmeric-kojic-acid-serum"
    ],
    contextProductSlugs: ["at13-arbutin-tranexamic-cream"],
    guideSlugs: [
      "niacinamide-tranexamic-serum-for-uneven-looking-tone",
      "how-to-use-tranexamic-serum-even-looking-complexion",
      "brightening-cream-for-even-looking-glow"
    ],
    introduction: [
      "A tone-focused serum should be chosen by the complete formula and routine fit, not by stacking the longest ingredient list. These three options use different combinations and concentrations, so the best starting point is the one that matches the ingredients you already use and the texture you can apply consistently.",
      "Introduce one tone-focused product at a time. That makes it easier to notice how your skin responds and avoids turning a simple routine into several overlapping active steps."
    ],
    choosingGuide: [
      { title: "TNV3 for a tranexamic-led option", body: "TNV3 centers 10% tranexamic acid with nicotinamide and vitamin C for shoppers prioritizing a tranexamic-focused formula." },
      { title: "NT16 for a niacinamide-led option", body: "NT16 combines 11% niacinamide with 5% tranexamic acid for a formula whose positioning begins with niacinamide." },
      { title: "KIT9+ for a turmeric and kojic blend", body: "KIT9+ combines niacinamide with turmeric and kojic acid for shoppers comparing a different ingredient profile." }
    ],
    routineSteps: [
      { title: "1. Keep the base routine simple", body: "Start with cleanser, one selected serum, moisturizer and daytime sunscreen." },
      { title: "2. Introduce gradually", body: "Follow packaging directions and avoid adding several unfamiliar tone-focused formulas at once." },
      { title: "3. Judge consistency, not instant change", body: "Cosmetic routines work best when they remain comfortable enough to use consistently. Stop if irritation develops." }
    ],
    faqs: [
      { question: "Can I use multiple uneven-tone serums together?", answer: "More is not automatically better. Because these formulas already contain overlapping ingredients, start with one and seek professional guidance if you are combining several strong or unfamiliar products." },
      { question: "Why is sunscreen part of an uneven-tone routine?", answer: "Daily sunscreen is a standard daytime skincare step. Follow the sunscreen label and reapplication directions, especially when your routine focuses on the appearance of uneven tone." }
    ]
  },
  {
    slug: "dry-skin-hydration",
    shortTitle: "Dry-Skin Hydration",
    title: "Hydrating Skincare for Dry, Dehydrated-Feeling Skin",
    description:
      "Compare hydrating Neatique serums, face creams and body cream by texture, routine position and area of use to build a simpler dry-skin routine.",
    primaryKeyword: "hydrating skincare for dry skin",
    secondaryKeywords: ["serum for dehydrated skin", "face cream for dry skin", "body cream for dry skin"],
    productSlugs: [
      "pdrn-cream",
      "snail-mucin-serum",
      "snail-mucin-cream",
      "nad-collagen-peptide-serum",
      "nad-face-cream",
      "bee-venom-body-cream"
    ],
    guideSlugs: [
      "what-to-look-for-in-a-barrier-repair-cream-for-dry-dehydrated-skin",
      "body-cream-for-dry-skin",
      "how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine",
      "serum-vs-cream-routine-order"
    ],
    introduction: [
      "Dry skin and dehydrated-feeling skin can both benefit from a routine that separates lightweight hydration from the final moisturizer step. A serum adds a thinner layer. A face cream adds a more cushioning finish. Body cream is formulated and positioned for areas such as arms and legs rather than replacing facial products by default.",
      "You do not need every texture in this collection. Choose the smallest combination that makes your routine feel comfortable: often one serum plus one moisturizer, or simply a cream when you prefer fewer steps."
    ],
    choosingGuide: [
      { title: "Choose serum for a thin hydration layer", body: "Snail mucin or NAD+ peptide serum can sit under an existing moisturizer when you want hydration without making the final step heavier." },
      { title: "Choose face cream for comfort", body: "PDRN, snail mucin and NAD+ face creams offer different formula stories but all occupy the moisturizer position in a facial routine." },
      { title: "Choose body cream for body areas", body: "Bee venom body cream is positioned for dry, rough-feeling areas such as arms, legs, neck and shoulders." }
    ],
    routineSteps: [
      { title: "1. Avoid an overcomplicated cleanse", body: "Use a cleanser that leaves your skin feeling comfortable rather than tight, then pat dry." },
      { title: "2. Add a serum only if useful", body: "Apply a thin hydration serum before moisturizer when your routine needs another layer." },
      { title: "3. Finish with the right cream", body: "Use face cream on facial areas and a body product where appropriate; complete daytime facial care with sunscreen." }
    ],
    faqs: [
      { question: "Do I need a serum if I already use face cream?", answer: "Not necessarily. A cream may be enough. Add a serum only when you prefer another lightweight layer or your current routine still feels insufficient." },
      { question: "What is the difference between dry and dehydrated-feeling skin?", answer: "People commonly use dry to describe a skin type and dehydrated-feeling to describe a temporary lack-of-water sensation. If tightness, flaking or irritation persists, consult a qualified professional." }
    ]
  }
];

export function getCollection(slug: string) {
  return COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
}

export function getCollectionsForProduct(productSlug: string) {
  return COLLECTIONS.filter(
    (collection) =>
      collection.productSlugs.includes(productSlug) ||
      collection.contextProductSlugs?.includes(productSlug)
  );
}

export function getCollectionsForPost(postSlug: string) {
  return COLLECTIONS.filter((collection) => collection.guideSlugs.includes(postSlug));
}
