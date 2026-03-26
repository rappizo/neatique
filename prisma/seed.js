const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function buildProductMediaUrl(folder, fileName) {
  return `/media/product/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

function buildSiteMediaUrl(folder, fileName) {
  return `/media/site/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

function buildProductGallery(folder, totalImages) {
  return Array.from({ length: totalImages }, (_, index) => buildProductMediaUrl(folder, `${index}.png`));
}

const products = [
  {
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

const reviewProfiles = [
  { displayName: "Olivia R.", rating: 5, title: "So easy to stay consistent with" },
  { displayName: "Emma L.", rating: 5, title: "My skin looks fresher every morning" },
  { displayName: "Sophia T.", rating: 4, title: "Really pretty finish on the skin" },
  { displayName: "Ava K.", rating: 5, title: "Lovely texture and no heaviness" },
  { displayName: "Mia C.", rating: 5, title: "Feels elegant in my routine" },
  { displayName: "Charlotte D.", rating: 4, title: "Soft glow without feeling sticky" },
  { displayName: "Amelia S.", rating: 5, title: "The texture feels very refined" },
  { displayName: "Harper W.", rating: 5, title: "One of the best steps in my routine" },
  { displayName: "Evelyn B.", rating: 4, title: "Comforting and easy to layer" },
  { displayName: "Abigail N.", rating: 5, title: "Makes my skin look smoother" },
  { displayName: "Ella P.", rating: 5, title: "Beautiful finish under the rest of my routine" },
  { displayName: "Scarlett H.", rating: 4, title: "Gives my skin a healthy look" },
  { displayName: "Grace M.", rating: 5, title: "I keep reaching for this one" },
  { displayName: "Lily F.", rating: 5, title: "Feels polished and easy to wear" },
  { displayName: "Chloe A.", rating: 5, title: "A really solid everyday favorite" }
];

const reviewToneBySlug = {
  "pdrn-cream": {
    texture: "rich yet smooth",
    finish: "soft, cushioned, and healthy-looking",
    routineStep: "the last step of my evening routine"
  },
  "pdrn-serum": {
    texture: "silky and lightweight",
    finish: "fresh, glowy, and smooth",
    routineStep: "right after cleansing and before cream"
  },
  "snail-mucin-cream": {
    texture: "cushiony and comforting",
    finish: "dewy, supple, and well-moisturized",
    routineStep: "as my sealing step at night"
  },
  "snail-mucin-serum": {
    texture: "light, bouncy, and easy to spread",
    finish: "hydrated, calm, and smooth",
    routineStep: "under moisturizer in the morning"
  }
};

const reviewBodyTemplates = [
  "The %TEXTURE% texture makes %PRODUCT% one of the easiest steps in my routine. My skin looks %FINISH% after I use it.",
  "I have been using this at %STEP%, and it makes my skin feel more comfortable and look more polished.",
  "This layers beautifully with the rest of my skincare. The finish is %FINISH% without looking too shiny.",
  "I like how simple this is to use every day. It feels %TEXTURE% and leaves my skin looking more refreshed.",
  "This has been a really nice addition to my routine. My skin looks smoother, softer, and more even after I use it.",
  "The texture feels beautiful and the finish stays very flattering through the day. I keep coming back to this one.",
  "I reach for this when my skin feels a little dull or tired. It gives me a more rested and comfortable look.",
  "This feels elegant rather than heavy, and it fits into my routine without any effort.",
  "The finish is exactly what I want from a daily skincare product: %FINISH% and easy to wear.",
  "I like using %PRODUCT% because it makes my skin feel cared for without making my routine complicated.",
  "This gives my skin a smoother look and a softer feel, especially when I use it consistently.",
  "The texture is very pleasant and it sits nicely with the rest of my products. My skin feels more balanced afterward.",
  "I noticed my skin looked more polished after the first few uses. It has a very pretty everyday finish.",
  "This is the kind of product that makes a routine feel complete. The texture is %TEXTURE% and the result is %FINISH%.",
  "I would happily repurchase this. It fits beautifully into my daily ritual and always leaves my skin looking better."
];

function buildReviewBody(product, index) {
  const tone = reviewToneBySlug[product.slug] || {
    texture: "smooth and comfortable",
    finish: "soft and healthy-looking",
    routineStep: "as part of my daily routine"
  };

  return reviewBodyTemplates[index]
    .replaceAll("%PRODUCT%", product.name)
    .replaceAll("%TEXTURE%", tone.texture)
    .replaceAll("%FINISH%", tone.finish)
    .replaceAll("%STEP%", tone.routineStep);
}

function buildSampleReviews(product) {
  return reviewProfiles.map((profile, index) => ({
    id: `sample-review-${product.slug}-${index + 1}`,
    productId: product.id,
    rating: profile.rating,
    title: profile.title,
    content: buildReviewBody(product, index),
    displayName: profile.displayName,
    verifiedPurchase: index % 3 !== 2,
    status: "PUBLISHED",
    source: "ADMIN_IMPORT",
    publishedAt: new Date(Date.UTC(2026, 2, index + 1, 9, 0, 0))
  }));
}

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product
    });
  }

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: post,
      create: post
    });
  }

  await prisma.customer.upsert({
    where: { email: "ava@neatiquebeauty.com" },
    update: {
      firstName: "Ava",
      lastName: "Miller",
      loyaltyPoints: 182,
      totalSpentCents: 16400
    },
    create: {
      email: "ava@neatiquebeauty.com",
      firstName: "Ava",
      lastName: "Miller",
      marketingOptIn: true,
      loyaltyPoints: 182,
      totalSpentCents: 16400
    }
  });

  const customer = await prisma.customer.findUnique({
    where: { email: "ava@neatiquebeauty.com" }
  });

  const creamProduct = await prisma.product.findUnique({
    where: { slug: "pdrn-cream" }
  });

  if (customer && creamProduct) {
    const order = await prisma.order.upsert({
      where: { orderNumber: "NEA-1001" },
      update: {
        status: "PAID",
        fulfillmentStatus: "PROCESSING",
        subtotalCents: 5200,
        totalCents: 5200,
        pointsEarned: 52,
        customerId: customer.id
      },
      create: {
        orderNumber: "NEA-1001",
        email: customer.email,
        status: "PAID",
        fulfillmentStatus: "PROCESSING",
        subtotalCents: 5200,
        totalCents: 5200,
        pointsEarned: 52,
        customerId: customer.id
      }
    });

    await prisma.orderItem.deleteMany({
      where: { orderId: order.id }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: creamProduct.id,
        name: creamProduct.name,
        slug: creamProduct.slug,
        quantity: 1,
        unitPriceCents: creamProduct.priceCents,
        lineTotalCents: creamProduct.priceCents,
        imageUrl: creamProduct.imageUrl
      }
    });
  }

  const seededProducts = await prisma.product.findMany({
    where: {
      slug: {
        in: products.map((product) => product.slug)
      }
    }
  });

  await prisma.productReview.deleteMany({
    where: {
      id: "seed-review-pdrn-serum-1"
    }
  });

  for (const product of seededProducts) {
    const sampleReviews = buildSampleReviews(product);

    await prisma.productReview.deleteMany({
      where: {
        id: {
          in: sampleReviews.map((review) => review.id)
        }
      }
    });

    for (const review of sampleReviews) {
      await prisma.productReview.create({
        data: review
      });
    }
  }

  const settings = [
    ["shipping_region", "United States only"],
    ["support_email", "support@neatiquebeauty.com"],
    ["reward_rule", "1 point per $1 spent"],
    ["stripe_mode", "Test mode until live keys are added"],
    ["email_enabled", "false"],
    ["smtp_host", ""],
    ["smtp_port", "587"],
    ["smtp_secure", "false"],
    ["smtp_user", ""],
    ["smtp_pass", ""],
    ["email_from_name", "Neatique Beauty"],
    ["email_from_address", ""],
    ["contact_recipient", ""]
  ];

  for (const [key, value] of settings) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
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
