import { Prisma } from "@prisma/client";
import type {
  AdminProductReviewPageRecord,
  AdminReviewProductSummary,
  BeautyPostRecord,
  CustomerAccountRecord,
  CustomerRecord,
  DashboardSummary,
  OrderRecord,
  ProductRecord,
  ProductReviewRecord,
  RewardEntryRecord,
  StoreSettingsRecord
} from "@/lib/types";
import { unstable_cache } from "next/cache";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { prisma } from "@/lib/db";
import {
  fallbackCustomers,
  fallbackDashboardSummary,
  fallbackOrders,
  fallbackPosts,
  fallbackProducts,
  fallbackReviews,
  fallbackRewards,
  fallbackSettings
} from "@/lib/fallback-data";
import { ensureStoreBootstrap } from "@/lib/store-bootstrap";

const PUBLIC_CONTENT_REVALIDATE_SECONDS = 60;

function parseGalleryImages(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTransientDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2024";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Timed out fetching a new connection from the connection pool") ||
    message.includes("Can't reach database server")
  );
}

async function withFallback<T>(
  run: () => Promise<T>,
  fallback: T,
  options?: {
    allowFallbackOnDatabaseError?: boolean;
  }
): Promise<T> {
  if (!hasValidPostgresDatabaseUrl()) {
    return fallback;
  }

  await ensureStoreBootstrap();

  try {
    return await run();
  } catch (error) {
    if (options?.allowFallbackOnDatabaseError && isTransientDatabaseError(error)) {
      console.error("Using fallback data after a transient database error:", error);
      return fallback;
    }

    throw error;
  }
}

function mapProductRecord(product: any, reviewCount: number, averageRating: number | null): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    category: product.category,
    shortDescription: product.shortDescription,
    description: product.description,
    details: product.details,
    imageUrl: product.imageUrl,
    galleryImages: parseGalleryImages(product.galleryImages),
    featured: product.featured,
    status: product.status,
    inventory: product.inventory,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents ?? null,
    currency: product.currency,
    pointsReward: product.pointsReward,
    stripePriceId: product.stripePriceId ?? null,
    reviewCount,
    averageRating,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt)
  };
}

function buildReviewStatusSummary<T extends { productId: string; status: string }>(
  reviews: T[]
) {
  const summary = new Map<
    string,
    {
      totalReviewCount: number;
      publishedReviewCount: number;
      pendingReviewCount: number;
      hiddenReviewCount: number;
    }
  >();

  for (const review of reviews) {
    const bucket =
      summary.get(review.productId) ??
      {
        totalReviewCount: 0,
        publishedReviewCount: 0,
        pendingReviewCount: 0,
        hiddenReviewCount: 0
      };

    bucket.totalReviewCount += 1;

    if (review.status === "PUBLISHED") {
      bucket.publishedReviewCount += 1;
    }

    if (review.status === "PENDING") {
      bucket.pendingReviewCount += 1;
    }

    if (review.status === "HIDDEN") {
      bucket.hiddenReviewCount += 1;
    }

    summary.set(review.productId, bucket);
  }

  return summary;
}

function mapProduct(product: any): ProductRecord {
  const publishedReviews = Array.isArray(product.reviews)
    ? product.reviews.filter((review: any) => review.status === "PUBLISHED")
    : [];
  const reviewCount = publishedReviews.length;
  const averageRating =
    reviewCount > 0
      ? publishedReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount
      : null;

  return mapProductRecord(product, reviewCount, averageRating);
}

function mapPost(post: any): BeautyPostRecord {
  return {
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
    publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt)
  };
}

function mapCustomer(customer: any): CustomerRecord {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName ?? null,
    lastName: customer.lastName ?? null,
    hasPassword: Boolean(customer.passwordHash),
    passwordSetAt: customer.passwordSetAt ? new Date(customer.passwordSetAt) : null,
    lastLoginAt: customer.lastLoginAt ? new Date(customer.lastLoginAt) : null,
    marketingOptIn: customer.marketingOptIn,
    loyaltyPoints: customer.loyaltyPoints,
    totalSpentCents: customer.totalSpentCents,
    orderCount: customer._count?.orders,
    reviewCount: customer._count?.reviews,
    createdAt: new Date(customer.createdAt),
    updatedAt: new Date(customer.updatedAt)
  };
}

function mapOrder(order: any): OrderRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    pointsEarned: order.pointsEarned,
    shippingName: order.shippingName ?? null,
    shippingAddress1: order.shippingAddress1 ?? null,
    shippingAddress2: order.shippingAddress2 ?? null,
    shippingCity: order.shippingCity ?? null,
    shippingState: order.shippingState ?? null,
    shippingPostalCode: order.shippingPostalCode ?? null,
    shippingCountry: order.shippingCountry ?? null,
    notes: order.notes ?? null,
    stripeCheckoutId: order.stripeCheckoutId ?? null,
    stripePaymentIntentId: order.stripePaymentIntentId ?? null,
    customerId: order.customerId ?? null,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    items: (order.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      imageUrl: item.imageUrl
    }))
  };
}

function mapReward(reward: any): RewardEntryRecord {
  return {
    id: reward.id,
    type: reward.type,
    points: reward.points,
    note: reward.note ?? null,
    orderId: reward.orderId ?? null,
    customerId: reward.customerId,
    customerEmail: reward.customer?.email ?? "Unknown customer",
    createdAt: new Date(reward.createdAt)
  };
}

function mapReview(review: any): ProductReviewRecord {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    content: review.content,
    displayName: review.displayName,
    status: review.status,
    verifiedPurchase: review.verifiedPurchase,
    adminNotes: review.adminNotes ?? null,
    source: review.source,
    productId: review.productId,
    productName: review.product?.name,
    productSlug: review.product?.slug,
    customerId: review.customerId ?? null,
    customerEmail: review.customer?.email ?? null,
    orderId: review.orderId ?? null,
    publishedAt: review.publishedAt ? new Date(review.publishedAt) : null,
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.updatedAt)
  };
}

const getFeaturedProductsFromDatabase = unstable_cache(
  async (limit: number) =>
    (
      await prisma.product.findMany({
        where: {
          featured: true,
          status: "ACTIVE"
        },
        include: {
          reviews: true
        },
        orderBy: [{ createdAt: "desc" }],
        take: limit
      })
    ).map(mapProduct),
  ["featured-products"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getActiveProductsFromDatabase = unstable_cache(
  async () =>
    (
      await prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: {
          reviews: true
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
      })
    ).map(mapProduct),
  ["active-products"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getProductBySlugFromDatabase = unstable_cache(
  async (slug: string) => {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        reviews: true
      }
    });

    return product ? mapProduct(product) : null;
  },
  ["product-by-slug"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getPublishedPostsFromDatabase = unstable_cache(
  async (limit?: number) =>
    (
      await prisma.post.findMany({
        where: { published: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: limit
      })
    ).map(mapPost),
  ["published-posts"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

const getPostBySlugFromDatabase = unstable_cache(
  async (slug: string) => {
    const post = await prisma.post.findUnique({
      where: { slug }
    });

    return post ? mapPost(post) : null;
  },
  ["post-by-slug"],
  { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS }
);

export async function getFeaturedProducts(limit = 4) {
  return withFallback(
    async () => getFeaturedProductsFromDatabase(limit),
    fallbackProducts.filter((product) => product.featured).slice(0, limit),
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getProducts() {
  return withFallback(
    async () =>
      (
        await prisma.product.findMany({
          include: {
            reviews: true
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapProduct),
    fallbackProducts
  );
}

export async function getActiveProducts() {
  return withFallback(
    async () => getActiveProductsFromDatabase(),
    fallbackProducts.filter((product) => product.status === "ACTIVE"),
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getProductBySlug(slug: string) {
  return withFallback(
    async () => getProductBySlugFromDatabase(slug),
    fallbackProducts.find((product) => product.slug === slug) ?? null,
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getProductById(id: string) {
  return withFallback(
    async () => {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          reviews: true
        }
      });

      return product ? mapProduct(product) : null;
    },
    fallbackProducts.find((product) => product.id === id) ?? null
  );
}

export async function getPublishedPosts(limit?: number) {
  return withFallback(
    async () => getPublishedPostsFromDatabase(limit),
    typeof limit === "number"
      ? fallbackPosts.filter((post) => post.published).slice(0, limit)
      : fallbackPosts.filter((post) => post.published),
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getAllPosts() {
  return withFallback(
    async () =>
      (
        await prisma.post.findMany({
          orderBy: [{ published: "desc" }, { updatedAt: "desc" }]
        })
      ).map(mapPost),
    fallbackPosts
  );
}

export async function getPostBySlug(slug: string) {
  return withFallback(
    async () => getPostBySlugFromDatabase(slug),
    fallbackPosts.find((post) => post.slug === slug) ?? null,
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getCustomers() {
  return withFallback(
    async () =>
      (
        await prisma.customer.findMany({
          include: {
            _count: {
              select: {
                orders: true,
                reviews: true
              }
            }
          },
          orderBy: [{ totalSpentCents: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapCustomer),
    fallbackCustomers
  );
}

export async function getOrders() {
  return withFallback(
    async () =>
      (
        await prisma.order.findMany({
          include: {
            items: true
          },
          orderBy: [{ createdAt: "desc" }]
        })
      ).map(mapOrder),
    fallbackOrders
  );
}

export async function getRewards() {
  return withFallback(
    async () =>
      (
        await prisma.rewardEntry.findMany({
          include: {
            customer: true
          },
          orderBy: [{ createdAt: "desc" }]
        })
      ).map(mapReward),
    fallbackRewards
  );
}

export async function getPublishedReviewsByProductId(productId: string) {
  return withFallback(
    async () =>
      (
        await prisma.productReview.findMany({
          where: {
            productId,
            status: "PUBLISHED"
          },
          include: {
            product: true,
            customer: true
          },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
        })
      ).map(mapReview),
    fallbackReviews.filter(
      (review) => review.productId === productId && review.status === "PUBLISHED"
    ),
    { allowFallbackOnDatabaseError: true }
  );
}

export async function getAllReviews() {
  return withFallback(
    async () =>
      (
        await prisma.productReview.findMany({
          include: {
            product: true,
            customer: true
          },
          orderBy: [{ createdAt: "desc" }]
        })
      ).map(mapReview),
    fallbackReviews
  );
}

export async function getAdminReviewProducts() {
  const fallback = (() => {
    const statusSummary = buildReviewStatusSummary(fallbackReviews);

    return fallbackProducts.map<AdminReviewProductSummary>((product) => {
      const bucket = statusSummary.get(product.id);

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        category: product.category,
        status: product.status,
        shortDescription: product.shortDescription,
        averageRating: product.averageRating ?? null,
        totalReviewCount: bucket?.totalReviewCount ?? product.reviewCount ?? 0,
        publishedReviewCount: bucket?.publishedReviewCount ?? product.reviewCount ?? 0,
        pendingReviewCount: bucket?.pendingReviewCount ?? 0,
        hiddenReviewCount: bucket?.hiddenReviewCount ?? 0
      };
    });
  })();

  return withFallback(
    async () => {
      const [products, statusRows, publishedRows] = await prisma.$transaction([
        prisma.product.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            category: true,
            shortDescription: true,
            description: true,
            details: true,
            imageUrl: true,
            galleryImages: true,
            featured: true,
            status: true,
            inventory: true,
            priceCents: true,
            compareAtPriceCents: true,
            currency: true,
            pointsReward: true,
            stripePriceId: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
        }),
        prisma.productReview.groupBy({
          by: ["productId", "status"],
          orderBy: [{ productId: "asc" }, { status: "asc" }],
          _count: { id: true }
        }),
        prisma.productReview.groupBy({
          by: ["productId"],
          orderBy: { productId: "asc" },
          where: { status: "PUBLISHED" },
          _count: { id: true },
          _avg: { rating: true }
        })
      ]);

      const statusSummary = new Map<
        string,
        {
          totalReviewCount: number;
          publishedReviewCount: number;
          pendingReviewCount: number;
          hiddenReviewCount: number;
        }
      >();

      for (const row of statusRows) {
        const countValue = row._count as { id?: number } | undefined;
        const count = countValue?.id ?? 0;
        const bucket =
          statusSummary.get(row.productId) ??
          {
            totalReviewCount: 0,
            publishedReviewCount: 0,
            pendingReviewCount: 0,
            hiddenReviewCount: 0
          };

        bucket.totalReviewCount += count;

        if (row.status === "PUBLISHED") {
          bucket.publishedReviewCount = count;
        }

        if (row.status === "PENDING") {
          bucket.pendingReviewCount = count;
        }

        if (row.status === "HIDDEN") {
          bucket.hiddenReviewCount = count;
        }

        statusSummary.set(row.productId, bucket);
      }

      const publishedSummary = new Map(
        publishedRows.map((row) => [row.productId, row])
      );

      return products.map<AdminReviewProductSummary>((product) => {
        const bucket = statusSummary.get(product.id);
        const published = publishedSummary.get(product.id);

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          category: product.category,
          status: product.status,
          shortDescription: product.shortDescription,
          averageRating: published?._avg?.rating ?? null,
          totalReviewCount: bucket?.totalReviewCount ?? 0,
          publishedReviewCount: bucket?.publishedReviewCount ?? 0,
          pendingReviewCount: bucket?.pendingReviewCount ?? 0,
          hiddenReviewCount: bucket?.hiddenReviewCount ?? 0
        };
      });
    },
    fallback
  );
}

export async function getAdminReviewPageByProductSlug(slug: string, page = 1, pageSize = 50) {
  const fallback = (() => {
    const product = fallbackProducts.find((item) => item.slug === slug);

    if (!product) {
      return null;
    }

    const productReviews = fallbackReviews
      .filter((review) => review.productId === product.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const counts = buildReviewStatusSummary(productReviews).get(product.id);
    const totalReviewCount = productReviews.length;
    const totalPages = Math.max(1, Math.ceil(totalReviewCount / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const reviews = productReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      product,
      reviews,
      totalReviewCount,
      publishedReviewCount: counts?.publishedReviewCount ?? product.reviewCount ?? 0,
      pendingReviewCount: counts?.pendingReviewCount ?? 0,
      hiddenReviewCount: counts?.hiddenReviewCount ?? 0,
      currentPage,
      totalPages,
      pageSize
    } satisfies AdminProductReviewPageRecord;
  })();

  return withFallback(
    async () => {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          category: true,
          shortDescription: true,
          description: true,
          details: true,
          imageUrl: true,
          galleryImages: true,
          featured: true,
          status: true,
          inventory: true,
          priceCents: true,
          compareAtPriceCents: true,
          currency: true,
          pointsReward: true,
          stripePriceId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!product) {
        return null;
      }

      const [statusRows, publishedAggregate, totalReviewCount] = await prisma.$transaction([
        prisma.productReview.groupBy({
          by: ["status"],
          orderBy: { status: "asc" },
          where: { productId: product.id },
          _count: { id: true }
        }),
        prisma.productReview.aggregate({
          where: {
            productId: product.id,
            status: "PUBLISHED"
          },
          _count: { id: true },
          _avg: { rating: true }
        }),
        prisma.productReview.count({
          where: { productId: product.id }
        })
      ]);

      let publishedReviewCount = 0;
      let pendingReviewCount = 0;
      let hiddenReviewCount = 0;

      for (const row of statusRows) {
        const countValue = row._count as { id?: number } | undefined;
        const count = countValue?.id ?? 0;
        if (row.status === "PUBLISHED") {
          publishedReviewCount = count;
        }

        if (row.status === "PENDING") {
          pendingReviewCount = count;
        }

        if (row.status === "HIDDEN") {
          hiddenReviewCount = count;
        }
      }

      const totalPages = Math.max(1, Math.ceil(totalReviewCount / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const reviews = (
        await prisma.productReview.findMany({
          where: { productId: product.id },
          include: {
            product: true,
            customer: true
          },
          orderBy: [{ createdAt: "desc" }],
          skip: (currentPage - 1) * pageSize,
          take: pageSize
        })
      ).map(mapReview);

      return {
        product: mapProductRecord(product, publishedReviewCount, publishedAggregate._avg?.rating ?? null),
        reviews,
        totalReviewCount,
        publishedReviewCount,
        pendingReviewCount,
        hiddenReviewCount,
        currentPage,
        totalPages,
        pageSize
      } satisfies AdminProductReviewPageRecord;
    },
    fallback
  );
}

export async function getStoreSettings() {
  return withFallback(
    async () => {
      const settings = await prisma.storeSetting.findMany({
        orderBy: { key: "asc" }
      });

      return settings.reduce<StoreSettingsRecord>((accumulator, setting) => {
        accumulator[setting.key] = setting.value;
        return accumulator;
      }, {});
    },
    fallbackSettings
  );
}

export async function getCustomerAccountById(customerId: string) {
  return withFallback<CustomerAccountRecord | null>(
    async () => {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          _count: {
            select: {
              orders: true,
              reviews: true
            }
          },
          orders: {
            include: {
              items: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          rewards: {
            include: {
              customer: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          reviews: {
            include: {
              product: true
            },
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      });

      if (!customer) {
        return null;
      }

      const purchasedProductIds = Array.from(
        new Set(
          customer.orders
            .filter((order) => order.status === "PAID" || order.status === "FULFILLED")
            .flatMap((order) =>
              order.items.map((item) => item.productId).filter((itemId): itemId is string => Boolean(itemId))
            )
        )
      );

      return {
        customer: mapCustomer(customer),
        orders: customer.orders.map(mapOrder),
        rewards: customer.rewards.map(mapReward),
        reviews: customer.reviews.map(mapReview),
        purchasedProductIds
      };
    },
    (() => {
      const customer = fallbackCustomers.find((item) => item.id === customerId);
      if (!customer) {
        return null;
      }

      const orders = fallbackOrders.filter((order) => order.customerId === customerId);
      const rewards = fallbackRewards.filter((reward) => reward.customerId === customerId);
      const reviews = fallbackReviews.filter((review) => review.customerId === customerId);
      const purchasedProductIds = Array.from(
        new Set(
          orders.flatMap((order) =>
            order.items
              .map((item) => fallbackProducts.find((product) => product.slug === item.slug)?.id)
              .filter((itemId): itemId is string => Boolean(itemId))
          )
        )
      );

      return {
        customer,
        orders,
        rewards,
        reviews,
        purchasedProductIds
      };
    })()
  );
}

export async function getDashboardSummary() {
  return withFallback(
    async () => {
      const [activeProductCount, publishedPostCount, customerCount, orders, rewards] =
        await prisma.$transaction([
          prisma.product.count({ where: { status: "ACTIVE" } }),
          prisma.post.count({ where: { published: true } }),
          prisma.customer.count(),
          prisma.order.findMany({
            include: { items: true },
            orderBy: { createdAt: "desc" }
          }),
          prisma.rewardEntry.findMany({
            include: { customer: true }
          })
        ]);

      const lowInventoryProducts = (
        await prisma.product.findMany({
          where: {
            inventory: {
              lt: 125
            }
          },
          orderBy: {
            inventory: "asc"
          }
        })
      ).map(mapProduct);

      const recentOrders = orders.slice(0, 5).map(mapOrder);
      const paidRevenueCents = orders
        .filter((order) => order.status === "PAID" || order.status === "FULFILLED")
        .reduce((sum, order) => sum + order.totalCents, 0);
      const pointsIssued = rewards.reduce((sum, reward) => sum + Math.max(reward.points, 0), 0);

      const summary: DashboardSummary = {
        activeProductCount,
        publishedPostCount,
        customerCount,
        orderCount: orders.length,
        paidRevenueCents,
        pointsIssued,
        lowInventoryProducts,
        recentOrders
      };

      return summary;
    },
    fallbackDashboardSummary
  );
}
