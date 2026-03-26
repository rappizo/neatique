"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  clearAdminSession,
  requireAdminSession,
  setAdminSession,
  validateAdminCredentials
} from "@/lib/admin-auth";
import type { FulfillmentStatus, OrderStatus, ProductStatus, ReviewStatus } from "@/lib/types";
import { normalizeMultilineValue, toBool, toInt, toPlainString, toPriceCents } from "@/lib/utils";

function buildPublishedDate(formData: FormData, published: boolean) {
  const rawDate = toPlainString(formData.get("publishedAt"));
  if (!published) {
    return null;
  }
  return rawDate ? new Date(rawDate) : new Date();
}

function refreshStorefront(productSlugs: string[] = []) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/beauty-tips");

  for (const slug of productSlugs) {
    revalidatePath(`/shop/${slug}`);
  }
}

function buildProductPriceData(formData: FormData) {
  const priceCents = toPriceCents(formData.get("priceCents"));
  const compareAtPriceCents = toPriceCents(formData.get("compareAtPriceCents"));

  return {
    priceCents,
    compareAtPriceCents: compareAtPriceCents > priceCents ? compareAtPriceCents : null
  };
}

export async function loginAction(formData: FormData) {
  const username = toPlainString(formData.get("username"));
  const password = toPlainString(formData.get("password"));

  if (!validateAdminCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }

  await setAdminSession(username);
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createProductAction(formData: FormData) {
  await requireAdminSession();

  const prices = buildProductPriceData(formData);

  const product = await prisma.product.create({
    data: {
      name: toPlainString(formData.get("name")),
      slug: toPlainString(formData.get("slug")),
      tagline: toPlainString(formData.get("tagline")),
      category: toPlainString(formData.get("category")),
      shortDescription: toPlainString(formData.get("shortDescription")),
      description: toPlainString(formData.get("description")),
      details: toPlainString(formData.get("details")),
      imageUrl: toPlainString(formData.get("imageUrl")),
      galleryImages: normalizeMultilineValue(formData.get("galleryImages")) || null,
      featured: toBool(formData.get("featured")),
      status: (toPlainString(formData.get("status")) || "DRAFT") as ProductStatus,
      inventory: toInt(formData.get("inventory")),
      priceCents: prices.priceCents,
      compareAtPriceCents: prices.compareAtPriceCents,
      currency: "USD",
      pointsReward: toInt(formData.get("pointsReward")),
      stripePriceId: toPlainString(formData.get("stripePriceId")) || null
    }
  });

  refreshStorefront([product.slug]);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}?status=created`);
}

export async function updateProductAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: {
      slug: true
    }
  });
  const prices = buildProductPriceData(formData);

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: toPlainString(formData.get("name")),
      slug: toPlainString(formData.get("slug")),
      tagline: toPlainString(formData.get("tagline")),
      category: toPlainString(formData.get("category")),
      shortDescription: toPlainString(formData.get("shortDescription")),
      description: toPlainString(formData.get("description")),
      details: toPlainString(formData.get("details")),
      imageUrl: toPlainString(formData.get("imageUrl")),
      galleryImages: normalizeMultilineValue(formData.get("galleryImages")) || null,
      featured: toBool(formData.get("featured")),
      status: (toPlainString(formData.get("status")) || "DRAFT") as ProductStatus,
      inventory: toInt(formData.get("inventory")),
      priceCents: prices.priceCents,
      compareAtPriceCents: prices.compareAtPriceCents,
      pointsReward: toInt(formData.get("pointsReward")),
      stripePriceId: toPlainString(formData.get("stripePriceId")) || null
    }
  });

  refreshStorefront(
    [existingProduct?.slug, product.slug].filter((slug): slug is string => Boolean(slug))
  );
  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}?status=updated`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      slug: true
    }
  });

  await prisma.product.delete({ where: { id } });

  refreshStorefront(product?.slug ? [product.slug] : []);
  revalidatePath("/admin/products");
  redirect("/admin/products?status=deleted");
}

export async function createPostAction(formData: FormData) {
  await requireAdminSession();

  const published = toBool(formData.get("published"));

  await prisma.post.create({
    data: {
      title: toPlainString(formData.get("title")),
      slug: toPlainString(formData.get("slug")),
      excerpt: toPlainString(formData.get("excerpt")),
      category: toPlainString(formData.get("category")),
      readTime: toInt(formData.get("readTime"), 4),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")),
      content: toPlainString(formData.get("content")),
      seoTitle: toPlainString(formData.get("seoTitle")),
      seoDescription: toPlainString(formData.get("seoDescription")),
      published,
      publishedAt: buildPublishedDate(formData, published)
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts?status=created");
}

export async function updatePostAction(formData: FormData) {
  await requireAdminSession();

  const published = toBool(formData.get("published"));
  const id = toPlainString(formData.get("id"));

  await prisma.post.update({
    where: { id },
    data: {
      title: toPlainString(formData.get("title")),
      slug: toPlainString(formData.get("slug")),
      excerpt: toPlainString(formData.get("excerpt")),
      category: toPlainString(formData.get("category")),
      readTime: toInt(formData.get("readTime"), 4),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")),
      content: toPlainString(formData.get("content")),
      seoTitle: toPlainString(formData.get("seoTitle")),
      seoDescription: toPlainString(formData.get("seoDescription")),
      published,
      publishedAt: buildPublishedDate(formData, published)
    }
  });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts?status=updated");
}

export async function deletePostAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  await prisma.post.delete({ where: { id } });

  revalidatePath("/beauty-tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts?status=deleted");
}

export async function updateOrderAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await prisma.order.update({
    where: { id },
    data: {
      status: (toPlainString(formData.get("status")) || "PENDING") as OrderStatus,
      fulfillmentStatus: (toPlainString(formData.get("fulfillmentStatus")) ||
        "UNFULFILLED") as FulfillmentStatus,
      notes: toPlainString(formData.get("notes")) || null
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect("/admin/orders?status=updated");
}

export async function adjustCustomerPointsAction(formData: FormData) {
  await requireAdminSession();

  const customerId = toPlainString(formData.get("customerId"));
  const points = toInt(formData.get("points"));
  const note = toPlainString(formData.get("note")) || "Manual loyalty adjustment";

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: {
          increment: points
        }
      }
    }),
    prisma.rewardEntry.create({
      data: {
        customerId,
        type: "ADJUSTMENT",
        points,
        note
      }
    })
  ]);

  revalidatePath("/admin/customers");
  revalidatePath("/admin/rewards");
  redirect("/admin/rewards?status=adjusted");
}

export async function updateCustomerAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await prisma.customer.update({
    where: { id },
    data: {
      firstName: toPlainString(formData.get("firstName")) || null,
      lastName: toPlainString(formData.get("lastName")) || null,
      marketingOptIn: toBool(formData.get("marketingOptIn"))
    }
  });

  revalidatePath("/admin/customers");
  redirect("/admin/customers?status=updated");
}

export async function updateReviewAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await prisma.productReview.update({
    where: { id },
    data: {
      rating: toInt(formData.get("rating"), 5),
      title: toPlainString(formData.get("title")),
      content: toPlainString(formData.get("content")),
      displayName: toPlainString(formData.get("displayName")),
      status: (toPlainString(formData.get("status")) || "PUBLISHED") as ReviewStatus,
      verifiedPurchase: toBool(formData.get("verifiedPurchase")),
      adminNotes: toPlainString(formData.get("adminNotes")) || null,
      publishedAt:
        (toPlainString(formData.get("status")) || "PUBLISHED") === "PUBLISHED" ? new Date() : null
    }
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/shop");
  redirect("/admin/reviews?status=updated");
}

export async function deleteReviewAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await prisma.productReview.delete({
    where: { id }
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/shop");
  redirect("/admin/reviews?status=deleted");
}

export async function bulkImportReviewsAction(formData: FormData) {
  await requireAdminSession();

  const raw = toPlainString(formData.get("rows"));

  if (!raw) {
    redirect("/admin/reviews?status=empty");
  }

  const rows = raw
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean);

  for (const row of rows) {
    const [productSlug, displayName, email, rating, title, content, verifiedPurchase, status] =
      row.split("|").map((item) => item.trim());

    const product = await prisma.product.findUnique({
      where: { slug: productSlug }
    });

    if (!product) {
      continue;
    }

    const customer = email
      ? await prisma.customer.findUnique({
          where: { email }
        })
      : null;

    await prisma.productReview.create({
      data: {
        productId: product.id,
        customerId: customer?.id ?? null,
        rating: Number.parseInt(rating || "5", 10),
        title,
        content,
        displayName,
        verifiedPurchase: verifiedPurchase === "true",
        status: (status || "PUBLISHED") as ReviewStatus,
        publishedAt: (status || "PUBLISHED") === "PUBLISHED" ? new Date() : null,
        source: "ADMIN_IMPORT"
      }
    });
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/shop");
  redirect("/admin/reviews?status=imported");
}

export async function saveStoreSettingsAction(formData: FormData) {
  await requireAdminSession();

  const settings = [
    ["shipping_region", toPlainString(formData.get("shipping_region"))],
    ["support_email", toPlainString(formData.get("support_email"))],
    ["reward_rule", toPlainString(formData.get("reward_rule"))],
    ["stripe_mode", toPlainString(formData.get("stripe_mode"))]
  ];

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin");
  redirect("/admin?status=settings-saved");
}

export async function saveEmailSettingsAction(formData: FormData) {
  await requireAdminSession();

  const settings = [
    ["email_enabled", toBool(formData.get("email_enabled")) ? "true" : "false"],
    ["smtp_host", toPlainString(formData.get("smtp_host"))],
    ["smtp_port", toPlainString(formData.get("smtp_port")) || "587"],
    ["smtp_secure", toBool(formData.get("smtp_secure")) ? "true" : "false"],
    ["smtp_user", toPlainString(formData.get("smtp_user"))],
    ["smtp_pass", toPlainString(formData.get("smtp_pass"))],
    ["email_from_name", toPlainString(formData.get("email_from_name")) || "Neatique Beauty"],
    ["email_from_address", toPlainString(formData.get("email_from_address"))],
    ["contact_recipient", toPlainString(formData.get("contact_recipient"))]
  ];

  await Promise.all(
    settings.map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  revalidatePath("/admin/email");
  redirect("/admin/email?status=saved");
}
