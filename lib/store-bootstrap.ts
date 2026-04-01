import { prisma } from "@/lib/db";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { getDefaultMascotRewards } from "@/lib/mascot-program";
import { ensureProductCodes } from "@/lib/product-codes";
import { samplePosts, sampleProducts, sampleStoreSettings } from "@/lib/sample-store-data";

let bootstrapState: "idle" | "running" | "ready" = "idle";
let bootstrapPromise: Promise<void> | null = null;

function usesRemoteDatabase() {
  return hasValidPostgresDatabaseUrl();
}

function serializeGalleryImages(galleryImages: string[]) {
  return galleryImages.join("\n");
}

async function seedMissingProducts() {
  const existingProducts = await prisma.product.findMany({
    select: {
      slug: true
    }
  });
  const existingSlugs = new Set(existingProducts.map((product) => product.slug));
  const missingProducts = sampleProducts.filter((product) => !existingSlugs.has(product.slug));

  if (missingProducts.length === 0) {
    return;
  }

  await prisma.product.createMany({
    data: missingProducts.map((product) => ({
      id: product.id,
      productCode: product.productCode,
      productShortName: product.productShortName,
      amazonAsin: product.amazonAsin,
      name: product.name,
      slug: product.slug,
      tagline: product.tagline,
      category: product.category,
      shortDescription: product.shortDescription,
      description: product.description,
      details: product.details,
      imageUrl: product.imageUrl,
      galleryImages: serializeGalleryImages(product.galleryImages),
      featured: product.featured,
      status: product.status,
      inventory: product.inventory,
      priceCents: product.priceCents,
      compareAtPriceCents: product.compareAtPriceCents,
      currency: product.currency,
      pointsReward: product.pointsReward,
      stripePriceId: product.stripePriceId
    })),
    skipDuplicates: true
  });
}

async function seedPostsIfEmpty() {
  const postCount = await prisma.post.count();

  if (postCount > 0) {
    return;
  }

  for (const post of samplePosts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        readTime: post.readTime,
        coverImageUrl: post.coverImageUrl,
        coverImageAlt: post.coverImageAlt,
        content: post.content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        aiGenerated: post.aiGenerated,
        focusKeyword: post.focusKeyword,
        secondaryKeywords: post.secondaryKeywords.join("\n"),
        imagePrompt: post.imagePrompt,
        externalLinks: JSON.stringify(post.externalLinks),
        generatedAt: post.generatedAt,
        sourceProductId: post.sourceProductId,
        published: post.published,
        publishedAt: post.publishedAt
      },
      create: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        category: post.category,
        readTime: post.readTime,
        coverImageUrl: post.coverImageUrl,
        coverImageAlt: post.coverImageAlt,
        content: post.content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        aiGenerated: post.aiGenerated,
        focusKeyword: post.focusKeyword,
        secondaryKeywords: post.secondaryKeywords.join("\n"),
        imagePrompt: post.imagePrompt,
        externalLinks: JSON.stringify(post.externalLinks),
        generatedAt: post.generatedAt,
        sourceProductId: post.sourceProductId,
        published: post.published,
        publishedAt: post.publishedAt
      }
    });
  }
}

async function seedSettingsIfEmpty() {
  const settingCount = await prisma.storeSetting.count();

  if (settingCount > 0) {
    return;
  }

  for (const [key, value] of Object.entries(sampleStoreSettings)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }
}

async function seedMascotsIfEmpty() {
  const defaultMascots = getDefaultMascotRewards();
  const existingMascots = await prisma.mascotReward.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  if (existingMascots.length === 0) {
    await prisma.mascotReward.createMany({
      data: defaultMascots.map((mascot) => ({
        id: mascot.id,
        sku: mascot.sku,
        name: mascot.name,
        slug: mascot.slug,
        description: mascot.description,
        imageUrl: mascot.imageUrl,
        pointsCost: mascot.pointsCost,
        active: mascot.active,
        sortOrder: mascot.sortOrder,
        createdAt: mascot.createdAt,
        updatedAt: mascot.updatedAt
      })),
      skipDuplicates: true
    });

    return;
  }

  const looksLikeLegacyMascotSet =
    existingMascots.length === defaultMascots.length &&
    existingMascots.every(
      (mascot) =>
        mascot.imageUrl.startsWith("data:image/svg+xml") || /^MSC\d+$/i.test(mascot.sku)
    );

  if (!looksLikeLegacyMascotSet) {
    return;
  }

  for (let index = 0; index < existingMascots.length; index += 1) {
    const existingMascot = existingMascots[index];
    const nextMascot = defaultMascots[index];

    if (!nextMascot) {
      continue;
    }

    await prisma.mascotReward.update({
      where: { id: existingMascot.id },
      data: {
        sku: nextMascot.sku,
        name: nextMascot.name,
        slug: nextMascot.slug,
        description: nextMascot.description,
        imageUrl: nextMascot.imageUrl,
        pointsCost: nextMascot.pointsCost,
        active: nextMascot.active,
        sortOrder: nextMascot.sortOrder
      }
    });
  }
}

async function runBootstrap() {
  if (!usesRemoteDatabase()) {
    bootstrapState = "ready";
    return;
  }

  await seedMissingProducts();
  await ensureProductCodes();
  await seedPostsIfEmpty();
  await seedSettingsIfEmpty();
  await seedMascotsIfEmpty();
  bootstrapState = "ready";
}

export async function ensureStoreBootstrap() {
  if (bootstrapState === "ready") {
    return;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapState = "running";
  bootstrapPromise = runBootstrap()
    .catch((error) => {
      bootstrapState = "idle";
      console.error("Store bootstrap skipped:", error);
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}
