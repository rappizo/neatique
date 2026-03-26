import type {
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

function parseGalleryImages(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function withFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error("Query fallback used:", error);
    return fallback;
  }
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

export async function getFeaturedProducts(limit = 4) {
  return withFallback(
    async () =>
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
    fallbackProducts.filter((product) => product.featured).slice(0, limit)
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
    fallbackProducts.filter((product) => product.status === "ACTIVE")
  );
}

export async function getProductBySlug(slug: string) {
  return withFallback(
    async () => {
      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          reviews: true
        }
      });

      return product ? mapProduct(product) : null;
    },
    fallbackProducts.find((product) => product.slug === slug) ?? null
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
    async () =>
      (
        await prisma.post.findMany({
          where: { published: true },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: limit
        })
      ).map(mapPost),
    typeof limit === "number"
      ? fallbackPosts.filter((post) => post.published).slice(0, limit)
      : fallbackPosts.filter((post) => post.published)
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
    async () => {
      const post = await prisma.post.findUnique({
        where: { slug }
      });

      return post ? mapPost(post) : null;
    },
    fallbackPosts.find((post) => post.slug === slug) ?? null
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
    )
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
