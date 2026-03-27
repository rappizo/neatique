import { prisma } from "@/lib/db";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { ensureProductCodes } from "@/lib/product-codes";
import { samplePosts, sampleProducts, sampleReviews, sampleStoreSettings } from "@/lib/sample-store-data";

let bootstrapState: "idle" | "running" | "ready" = "idle";
let bootstrapPromise: Promise<void> | null = null;

function usesRemoteDatabase() {
  return hasValidPostgresDatabaseUrl();
}

function serializeGalleryImages(galleryImages: string[]) {
  return galleryImages.join("\n");
}

async function seedProductsIfEmpty() {
  const productCount = await prisma.product.count();

  if (productCount > 0) {
    return;
  }

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        productCode: product.productCode,
        productShortName: product.productShortName,
        amazonAsin: product.amazonAsin,
        name: product.name,
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
      },
      create: {
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
      }
    });
  }
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
        content: post.content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
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
        content: post.content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
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

async function seedReviewsIfEmpty() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true
    }
  });

  const productIdBySlug = new Map(products.map((product) => [product.slug, product.id]));
  const sampleReviewIds = sampleReviews.map((review) => review.id);
  const existingSampleReviews = await prisma.productReview.findMany({
    where: {
      id: {
        in: sampleReviewIds
      }
    },
    select: {
      id: true
    }
  });
  const existingReviewIds = new Set(existingSampleReviews.map((review) => review.id));
  const missingReviews = sampleReviews
    .map((review) => {
      const productSlug = review.productSlug;

      if (!productSlug || existingReviewIds.has(review.id)) {
        return null;
      }

      const productId = productIdBySlug.get(productSlug);

      if (!productId) {
        return null;
      }

      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        displayName: review.displayName,
        status: review.status,
        verifiedPurchase: review.verifiedPurchase,
        adminNotes: review.adminNotes,
        source: review.source,
        productId,
        customerId: null,
        orderId: null,
        publishedAt: review.publishedAt
      };
    })
    .filter((review): review is NonNullable<typeof review> => Boolean(review));

  if (missingReviews.length === 0) {
    return;
  }

  for (let index = 0; index < missingReviews.length; index += 100) {
    await prisma.productReview.createMany({
      data: missingReviews.slice(index, index + 100),
      skipDuplicates: true
    });
  }
}

async function runBootstrap() {
  if (!usesRemoteDatabase()) {
    bootstrapState = "ready";
    return;
  }

  await seedProductsIfEmpty();
  await ensureProductCodes();
  await seedPostsIfEmpty();
  await seedSettingsIfEmpty();
  await seedReviewsIfEmpty();
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
