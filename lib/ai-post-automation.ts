import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  generateSeoPostDraftWithAi,
  generateSeoPostImageWithAi,
  getOpenAiPostSettings
} from "@/lib/openai-posts";
import type { AiPostAutomationOverviewRecord, StoreSettingsRecord } from "@/lib/types";

const AI_POST_SETTING_KEYS = [
  "ai_post_enabled",
  "ai_post_cadence_days",
  "ai_post_auto_publish",
  "ai_post_include_external_links",
  "ai_post_last_run_at",
  "ai_post_last_status",
  "ai_post_last_post_id",
  "ai_post_rotation_cursor"
] as const;

type AiPostAutomationSettings = {
  enabled: boolean;
  cadenceDays: number;
  autoPublish: boolean;
  includeExternalLinks: boolean;
  lastRunAt: Date | null;
  lastStatus: string | null;
  lastPostId: string | null;
  rotationCursor: string | null;
};

type RunAiPostAutomationInput = {
  trigger: "manual" | "cron";
};

export type RunAiPostAutomationResult =
  | {
      ok: true;
      created: true;
      published: boolean;
      postId: string;
      postTitle: string;
      postSlug: string;
      sourceProductId: string;
      status: string;
    }
  | {
      ok: true;
      created: false;
      status: string;
      reason: string;
    }
  | {
      ok: false;
      status: string;
      error: string;
    };

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return value === "true";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getAiPostAutomationSettings(settings: StoreSettingsRecord): AiPostAutomationSettings {
  return {
    enabled: parseBoolean(settings.ai_post_enabled, false),
    cadenceDays: parsePositiveInt(settings.ai_post_cadence_days, 2),
    autoPublish: parseBoolean(settings.ai_post_auto_publish, false),
    includeExternalLinks: parseBoolean(settings.ai_post_include_external_links, true),
    lastRunAt: parseDate(settings.ai_post_last_run_at),
    lastStatus: settings.ai_post_last_status || null,
    lastPostId: settings.ai_post_last_post_id || null,
    rotationCursor: settings.ai_post_rotation_cursor || null
  };
}

async function loadStoreSettingsMap() {
  const settings = await prisma.storeSetting.findMany({
    orderBy: {
      key: "asc"
    }
  });

  return settings.reduce<Record<string, string>>((accumulator, setting) => {
    accumulator[setting.key] = setting.value;
    return accumulator;
  }, {});
}

async function saveAutomationState(nextState: Partial<Record<(typeof AI_POST_SETTING_KEYS)[number], string>>) {
  await Promise.all(
    Object.entries(nextState).map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value: value || "" },
        create: { key, value: value || "" }
      })
    )
  );
}

function getNextProductCursor<T extends { id: string }>(
  products: T[],
  cursor: string | null
) {
  if (products.length === 0) {
    return null;
  }

  if (!cursor) {
    return products[0];
  }

  const currentIndex = products.findIndex((product) => product.id === cursor);

  if (currentIndex === -1 || currentIndex === products.length - 1) {
    return products[0];
  }

  return products[currentIndex + 1];
}

async function ensureUniquePostSlug(baseSlug: string) {
  const normalizedBase = baseSlug || "neatique-beauty-tip";
  let nextSlug = normalizedBase;
  let suffix = 2;

  while (
    await prisma.post.findUnique({
      where: { slug: nextSlug },
      select: { id: true }
    })
  ) {
    nextSlug = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

function isDueForAutomation(lastRunAt: Date | null, cadenceDays: number) {
  if (!lastRunAt) {
    return true;
  }

  const elapsedMs = Date.now() - lastRunAt.getTime();
  return elapsedMs >= cadenceDays * 24 * 60 * 60 * 1000;
}

export async function runAiPostAutomation(
  input: RunAiPostAutomationInput
): Promise<RunAiPostAutomationResult> {
  const [settingsMap, openAiSettings] = await Promise.all([
    loadStoreSettingsMap(),
    Promise.resolve(getOpenAiPostSettings())
  ]);
  const settings = getAiPostAutomationSettings(settingsMap);

  if (input.trigger === "cron" && !settings.enabled) {
    return {
      ok: true,
      created: false,
      status: "disabled",
      reason: "AI post automation is disabled."
    };
  }

  if (!openAiSettings.ready) {
    return {
      ok: false,
      status: "missing-openai-key",
      error: "OPENAI_API_KEY is not configured."
    };
  }

  if (input.trigger === "cron" && !isDueForAutomation(settings.lastRunAt, settings.cadenceDays)) {
    return {
      ok: true,
      created: false,
      status: "not-due",
      reason: "The next AI post is not due yet."
    };
  }

  if (!settings.autoPublish && input.trigger === "cron") {
    const existingDraft = await prisma.post.findFirst({
      where: {
        aiGenerated: true,
        published: false
      },
      select: {
        id: true
      },
      orderBy: [{ createdAt: "desc" }]
    });

    if (existingDraft) {
      return {
        ok: true,
        created: false,
        status: "draft-pending",
        reason: "An unpublished AI draft already exists."
      };
    }
  }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE"
    },
    select: {
      id: true,
      productCode: true,
      productShortName: true,
      name: true,
      slug: true,
      tagline: true,
      category: true,
      shortDescription: true,
      description: true,
      details: true,
      imageUrl: true,
      priceCents: true,
      compareAtPriceCents: true,
      createdAt: true
    },
    orderBy: [{ productCode: "asc" }, { createdAt: "asc" }]
  });

  const sourceProduct = getNextProductCursor(products, settings.rotationCursor);

  if (!sourceProduct) {
    return {
      ok: false,
      status: "no-products",
      error: "No active products are available for AI post automation."
    };
  }

  const recentPosts = await prisma.post.findMany({
    where: {
      aiGenerated: true,
      sourceProductId: sourceProduct.id
    },
    select: {
      title: true,
      slug: true,
      focusKeyword: true
    },
    orderBy: [{ createdAt: "desc" }],
    take: 8
  });

  try {
    const draft = await generateSeoPostDraftWithAi({
      product: sourceProduct,
      recentPosts,
      includeExternalLinks: settings.includeExternalLinks
    });
    const uniqueSlug = await ensureUniquePostSlug(draft.slug);
    const imageAsset = await generateSeoPostImageWithAi(draft.imagePrompt);
    const postId = randomUUID();
    const now = new Date();
    const published = settings.autoPublish;

    const post = await prisma.post.create({
      data: {
        id: postId,
        title: draft.title,
        slug: uniqueSlug,
        excerpt: draft.excerpt,
        category: draft.category,
        readTime: draft.readTime,
        coverImageUrl: `/media/post/${postId}?v=${now.getTime()}`,
        coverImageAlt: draft.coverImageAlt,
        coverImageData: imageAsset.base64Data,
        coverImageMimeType: imageAsset.mimeType,
        content: draft.content,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        aiGenerated: true,
        focusKeyword: draft.focusKeyword,
        secondaryKeywords: draft.secondaryKeywords.join("\n"),
        imagePrompt: draft.imagePrompt,
        externalLinks: JSON.stringify(draft.externalLinks),
        generatedAt: now,
        sourceProductId: sourceProduct.id,
        published,
        publishedAt: published ? now : null
      }
    });

    await saveAutomationState({
      ai_post_last_run_at: now.toISOString(),
      ai_post_last_status: published ? "published" : "draft-created",
      ai_post_last_post_id: post.id,
      ai_post_rotation_cursor: sourceProduct.id
    });

    revalidatePath("/admin/posts");
    if (published) {
      revalidatePath("/");
      revalidatePath("/beauty-tips");
      revalidatePath(`/beauty-tips/${post.slug}`);
      revalidatePath("/sitemap.xml");
    }

    return {
      ok: true,
      created: true,
      published,
      postId: post.id,
      postTitle: post.title,
      postSlug: post.slug,
      sourceProductId: sourceProduct.id,
      status: published ? "published" : "draft-created"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI post generation failed.";

    await saveAutomationState({
      ai_post_last_run_at: new Date().toISOString(),
      ai_post_last_status: `failed:${message}`
    });

    return {
      ok: false,
      status: "failed",
      error: message
    };
  }
}

export async function getAiPostAutomationOverview(): Promise<AiPostAutomationOverviewRecord> {
  const [settingsMap, openAiSettings, products, postCounts] = await Promise.all([
    loadStoreSettingsMap(),
    Promise.resolve(getOpenAiPostSettings()),
    prisma.product.findMany({
      where: {
        status: "ACTIVE"
      },
      select: {
        id: true,
        productCode: true,
        name: true,
        createdAt: true
      },
      orderBy: [{ productCode: "asc" }, { createdAt: "asc" }]
    }),
    prisma.post.groupBy({
      by: ["published"],
      where: {
        aiGenerated: true
      },
      _count: {
        id: true
      }
    })
  ]);

  const settings = getAiPostAutomationSettings(settingsMap);
  const nextProduct = getNextProductCursor(products, settings.rotationCursor);
  const publishedGroup = postCounts.find((item) => item.published);
  const draftGroup = postCounts.find((item) => !item.published);
  const lastPost =
    settings.lastPostId
      ? await prisma.post.findUnique({
          where: { id: settings.lastPostId },
          select: {
            title: true
          }
        })
      : null;

  return {
    enabled: settings.enabled,
    cadenceDays: settings.cadenceDays,
    autoPublish: settings.autoPublish,
    includeExternalLinks: settings.includeExternalLinks,
    lastRunAt: settings.lastRunAt,
    lastStatus: settings.lastStatus,
    lastPostId: settings.lastPostId,
    lastPostTitle: lastPost?.title ?? null,
    rotationCursor: settings.rotationCursor,
    nextProductId: nextProduct?.id ?? null,
    nextProductName: nextProduct?.name ?? null,
    nextProductCode: nextProduct?.productCode ?? null,
    aiPostCount: postCounts.reduce((sum, item) => sum + item._count.id, 0),
    publishedAiPostCount: publishedGroup?._count.id ?? 0,
    draftAiPostCount: draftGroup?._count.id ?? 0,
    model: openAiSettings.model,
    imageModel: openAiSettings.imageModel
  };
}
