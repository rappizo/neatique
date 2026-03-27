const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function buildProductMediaUrl(folder, fileName) {
  return `/media/product/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

function buildSiteMediaUrl(folder, fileName) {
  return `/media/site/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

function buildProductGallery(folder, totalImages) {
  return Array.from({ length: totalImages }, (_, index) =>
    buildProductMediaUrl(folder, `${index}.png`)
  );
}

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

function buildDisplayName(index) {
  const firstName = firstNames[index % firstNames.length];
  const lastInitial = lastInitials[(index * 7 + 3) % lastInitials.length];
  return `${firstName} ${lastInitial}.`;
}

const products = [
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
    imageUrl: buildProductMediaUrl("HH061 AT13 8% Arbutin + 5% Tranexamic Cream", "01.png"),
    galleryImages: [
      "01.png",
      "02.png",
      "03.png",
      "04.png",
      "05.png",
      "06.png",
      "07.jpg"
    ]
      .map((fileName) => buildProductMediaUrl("HH061 AT13 8% Arbutin + 5% Tranexamic Cream", fileName))
      .join("\n"),
    featured: false,
    status: "ACTIVE",
    inventory: 118,
    priceCents: 2499,
    compareAtPriceCents: 3999,
    currency: "USD",
    pointsReward: 25
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
    imageUrl: buildProductMediaUrl("HH075 PDRN Cream", "0.png"),
    galleryImages: buildProductGallery("HH075 PDRN Cream", 8).join("\n"),
    featured: true,
    status: "ACTIVE",
    inventory: 120,
    priceCents: 5200,
    compareAtPriceCents: 6400,
    currency: "USD",
    pointsReward: 52
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
    imageUrl: buildProductMediaUrl("HH079 PDRN Serum", "0.png"),
    galleryImages: buildProductGallery("HH079 PDRN Serum", 9).join("\n"),
    featured: true,
    status: "ACTIVE",
    inventory: 140,
    priceCents: 4800,
    compareAtPriceCents: 5900,
    currency: "USD",
    pointsReward: 48
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
    imageUrl: buildProductMediaUrl("HH069 SC93 Snail Mucin Cream", "0.png"),
    galleryImages: buildProductGallery("HH069 SC93 Snail Mucin Cream", 8).join("\n"),
    featured: true,
    status: "ACTIVE",
    inventory: 110,
    priceCents: 4200,
    compareAtPriceCents: 5200,
    currency: "USD",
    pointsReward: 42
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
    imageUrl: buildProductMediaUrl("HH068 SE96 Snail Mucin Serum", "0.png"),
    galleryImages: buildProductGallery("HH068 SE96 Snail Mucin Serum", 8).join("\n"),
    featured: true,
    status: "ACTIVE",
    inventory: 135,
    priceCents: 3900,
    compareAtPriceCents: 4900,
    currency: "USD",
    pointsReward: 39
  }
];

const posts = [
  {
    id: "post_pdrn_intro",
    title: "What PDRN Skincare Is and Why It Is Everywhere Right Now",
    slug: "what-is-pdrn-skincare",
    excerpt:
      "A beginner-friendly breakdown of PDRN, its role in modern routines, and how to use it alongside hydrators and barrier creams.",
    category: "Ingredient Guide",
    readTime: 5,
    coverImageUrl: buildSiteMediaUrl("blog", "PDRN Guide.png"),
    content:
      "PDRN has quickly become one of the most talked-about skin support ingredients in advanced routines. In topical skincare, people reach for PDRN-focused formulas when they want a routine that feels restorative, modern, and glow-forward.\n\nThe easiest way to use PDRN is by layering it after cleansing and before moisturizer. A serum gives quick hydration and slip, while a cream helps hold moisture in place.\n\nFor dry or tired-looking skin, pairing a PDRN serum with a richer cream can create a soft, supported finish. If your skin is easily overwhelmed, keep the rest of the routine simple and focus on hydration, barrier support, and sunscreen during the day.",
    seoTitle: "What Is PDRN Skincare? Benefits, Texture, and Routine Tips",
    seoDescription:
      "Learn what PDRN skincare is, who it suits, and how to use a PDRN serum or cream in a modern routine.",
    published: true,
    publishedAt: new Date("2026-03-18T09:00:00.000Z")
  },
  {
    id: "post_snail_dry",
    title: "How to Build a Snail Mucin Routine for Dry, Dehydrated Skin",
    slug: "snail-mucin-routine-for-dry-skin",
    excerpt:
      "Use snail mucin to create a calm, cushiony routine that focuses on hydration, bounce, and visible comfort.",
    category: "Routine Tips",
    readTime: 4,
    coverImageUrl: buildSiteMediaUrl("blog", "Snail Routine.png"),
    content:
      "Snail mucin routines are loved for their comforting, replenishing feel. If your skin often feels tight or flaky, start with a gentle cleanser, then apply a hydrating serum while the skin is still slightly damp.\n\nFollow with a cream that helps seal in moisture and reduce that dry, stretched feeling. During the day, finish with a sunscreen you enjoy wearing.\n\nAt night, you can keep the same steps and apply a slightly fuller layer of cream for extra comfort. The goal is consistency, not complexity.",
    seoTitle: "Snail Mucin Routine for Dry Skin: A Simple Layering Guide",
    seoDescription:
      "A simple, effective snail mucin skincare routine for dry or dehydrated skin, including layering tips for serum and cream.",
    published: true,
    publishedAt: new Date("2026-03-15T09:00:00.000Z")
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
    publishedAt: new Date("2026-03-10T09:00:00.000Z")
  }
];

const reviewPlans = {
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

const reviewContextHooks = [
  "during travel weeks",
  "while working long office days",
  "after late nights",
  "during colder weather",
  "in humid mornings",
  "for quick weekday routines"
];

const reviewResultHooks = [
  "my skin tone looks more even",
  "dry areas feel softer",
  "makeup sits cleaner on top",
  "my face feels less tight by evening",
  "my routine feels more balanced",
  "the finish looks smoother in daylight"
];

const reviewClosingHooks = [
  "I already ordered another one.",
  "This is in my weekly rotation now.",
  "I keep reaching for it over other options.",
  "It feels like a dependable staple.",
  "I would buy this again.",
  "It made my routine easier to stick to."
];

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

function seededFloat(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function pickVariant(values, seed) {
  return values[Math.floor(seededFloat(seed) * values.length) % values.length];
}

function buildReviewDate(productSlug, index) {
  const now = new Date();
  const seed = productSlug.length * 97 + index * 131 + 17;
  const minutesBack = Math.floor(seededFloat(seed + 1) * 180 * 24 * 60);
  const date = new Date(now.getTime() - minutesBack * 60 * 1000);
  const roundedMinutes = Math.floor(date.getUTCMinutes() / 5) * 5;
  date.setUTCMinutes(roundedMinutes, 0, 0);
  return date;
}

function buildUniqueReviewCopy(product, plan, index, seen) {
  const baseSeed = product.slug.length * 1000 + index * 17 + 9;
  const title = pickVariant(plan.titlePhrases, baseSeed + 3);
  const texture = pickVariant(plan.texturePhrases, baseSeed + 7);
  const finish = pickVariant(plan.finishPhrases, baseSeed + 11);
  const timing = pickVariant(plan.timingPhrases, baseSeed + 13);
  const result = pickVariant(plan.resultPhrases, baseSeed + 19);
  const context = pickVariant(reviewContextHooks, baseSeed + 23);
  const extraResult = pickVariant(reviewResultHooks, baseSeed + 29);
  const closing = pickVariant(reviewClosingHooks, baseSeed + 31);
  const lifestyle = pickVariant(reviewLifestyleHooks, baseSeed + 37);
  const extraFinish = pickVariant(reviewFinishHooks, baseSeed + 41);
  const opinion = pickVariant(reviewOpinionHooks, baseSeed + 43);

  const variants = [
    {
      title: title,
      content: `First impression: ${product.name} felt ${texture}. ${context} was exactly when I noticed it most. Using it ${timing}, ${result}. ${closing}`
    },
    {
      title: `${title} - ${context}`,
      content: `Two weeks in, the main thing I notice is this: ${result}. ${product.name} feels ${texture}, the finish looks ${finish}, and ${closing}`
    },
    {
      title: `${product.name}: ${title.toLowerCase()}`,
      content: `Short version: ${product.name} is ${texture}. I reach for it ${timing}, especially ${lifestyle}. ${closing}`
    },
    {
      title: `Why I kept ${product.name}`,
      content: `I tried ${product.name} because I wanted something that felt more refined. What stood out quickly was how ${texture} it feels and how ${result}. ${extraFinish}`
    },
    {
      title: `${product.name} surprised me`,
      content: `My skin usually tells me right away when something is too much, but this one landed nicely. ${product.name} feels ${texture}, and ${result}. ${extraFinish} ${closing}`
    },
    {
      title: `Worth it for the texture`,
      content: `The texture sold me first. ${product.name} is ${texture}, sits well ${timing}, and ${result}.`
    },
    {
      title: `Better than expected`,
      content: `Honestly, I expected this to be just okay. Instead, ${product.name} feels ${texture}, looks more refined on skin, and ${result}. ${closing}`
    },
    {
      title: `${product.name} on busy mornings`,
      content: `On busy mornings, I want something that behaves well without extra work. ${product.name} feels ${texture}, layers nicely ${timing}, and ${result}. The finish looks ${finish}.`
    },
    {
      title: `A calm finish without heaviness`,
      content: `At night, comfort matters more to me than anything else. ${product.name} feels ${texture}, and ${result}. ${closing}`
    },
    {
      title: `${product.name} after a few weeks`,
      content: `After a few weeks, the consistency is what kept me using ${product.name}. The finish looks ${finish}, ${extraResult}, and ${closing}`
    },
    {
      title: `If you care about texture`,
      content: `If you care about texture, this one is easy to appreciate. ${product.name} feels ${texture}. ${extraFinish} ${closing}`
    },
    {
      title: `${title} - honest review`,
      content: `${opinion} ${product.name} feels ${texture}, looks ${finish}, and ${result}.`
    },
    {
      title: `The difference showed up later`,
      content: `The difference showed up most in how my skin looked later in the day. ${product.name} feels ${texture}, and ${result}. ${extraResult}.`
    },
    {
      title: `${product.name} kept earning a spot`,
      content: `I kept rotating this with other products and still came back to it. ${product.name} feels ${texture}, and ${result}. ${closing}`
    },
    {
      title: `Routine note on ${product.name}`,
      content: `Routine note: I use ${product.name} ${timing}. The texture feels ${texture}, the finish looks ${finish}, and ${result}. ${extraFinish}`
    },
    {
      title: `${title} for real life`,
      content: `For real life, this just works. ${product.name} feels ${texture}, looks elegant on skin, and ${result}. ${closing}`
    }
  ];
  const startIndex = Math.floor(seededFloat(baseSeed + 53) * variants.length) % variants.length;

  for (let attempt = 0; attempt < variants.length + 4; attempt += 1) {
    const variant = variants[(startIndex + attempt) % variants.length];
    const nextTitle =
      attempt < variants.length
        ? variant.title
        : `${variant.title} (${index + 1}-${attempt - variants.length + 1})`;
    const nextContent =
      attempt < variants.length
        ? variant.content
        : `${variant.content} I use it ${timing} and still get a ${finish} look.`;
    const signature = `${nextTitle}\n${nextContent}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      return {
        title: nextTitle,
        content: nextContent
      };
    }
  }

  const fallbackTitle = `${title} #${index + 1}`;
  const fallbackContent = `${product.name} feels ${texture}, looks ${finish}, and ${result}. ${closing}`;
  seen.add(`${fallbackTitle}\n${fallbackContent}`);

  return {
    title: fallbackTitle,
    content: fallbackContent
  };
}

function buildSampleReviews(product) {
  const plan = reviewPlans[product.slug];

  if (!plan || plan.count <= 0) {
    return [];
  }

  const seen = new Set();

  return Array.from({ length: plan.count }, (_, index) => {
    const reviewDate = buildReviewDate(product.slug, index);
    const copy = buildUniqueReviewCopy(product, plan, index, seen);

    return {
      id: `sample-review-${product.slug}-${index + 1}`,
      productId: product.id,
      rating: plan.ratings[index % plan.ratings.length],
      title: copy.title,
      content: copy.content,
      displayName: buildDisplayName(index + product.slug.length),
      reviewDate,
      verifiedPurchase: index % 4 !== 0,
      status: "PUBLISHED",
      source: "ADMIN_IMPORT",
      publishedAt: reviewDate,
      createdAt: reviewDate,
      updatedAt: reviewDate
    };
  });
}

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        productCode: product.productCode,
        productShortName: product.productShortName ?? null,
        amazonAsin: product.amazonAsin ?? null,
        name: product.name,
        tagline: product.tagline,
        category: product.category,
        shortDescription: product.shortDescription,
        description: product.description,
        details: product.details,
        imageUrl: product.imageUrl,
        galleryImages: product.galleryImages,
        featured: product.featured,
        status: product.status,
        inventory: product.inventory,
        priceCents: product.priceCents,
        compareAtPriceCents: product.compareAtPriceCents,
        currency: product.currency,
        pointsReward: product.pointsReward
      },
      create: {
        ...product,
        productShortName: product.productShortName ?? null,
        amazonAsin: product.amazonAsin ?? null
      }
    });
  }

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        readTime: post.readTime,
        coverImageUrl: post.coverImageUrl,
        content: post.content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        published: post.published,
        publishedAt: post.publishedAt
      },
      create: post
    });
  }

  for (const [key, value] of Object.entries({
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
  })) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  const storedProducts = await prisma.product.findMany({
    where: {
      slug: {
        in: products.map((product) => product.slug)
      }
    }
  });

  for (const product of storedProducts) {
    const sampleReviews = buildSampleReviews(product);

    await prisma.productReview.deleteMany({
      where: {
        productId: product.id
      }
    });

    for (let index = 0; index < sampleReviews.length; index += 100) {
      await prisma.productReview.createMany({
        data: sampleReviews.slice(index, index + 100)
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
