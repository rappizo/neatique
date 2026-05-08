import { Buffer } from "node:buffer";
import { prisma } from "@/lib/db";
import {
  getComicImageExtension,
  storeComicImage
} from "@/lib/comic-image-storage";
import type {
  ComicReferenceImageFile,
  ComicResolvedReferenceImage
} from "@/lib/comic-reference-images";
import { slugify } from "@/lib/utils";

type ComicProductLockProduct = {
  id: string;
  productCode: string | null;
  productShortName: string | null;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
};

export type ComicProductLockPromptContext = {
  id: string;
  displayName: string;
  shortCode: string;
  slug: string;
  visualNotes: string;
  usageNotes: string;
  referenceNotes: string | null;
  imageUrl: string | null;
  imageData: string | null;
  imageMimeType: string | null;
  imageByteSize: number | null;
  imageGeneratedAt: Date | null;
};

export function buildComicProductLockMediaUrl(lockId: string) {
  return `/media/comic-product-lock/${lockId}?v=${Date.now()}`;
}

function normalizeShortCode(value?: string | null) {
  const normalized = (value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .trim();

  return normalized.slice(0, 12);
}

export function deriveComicProductShortCode(product: Pick<ComicProductLockProduct, "productCode" | "productShortName" | "name" | "slug">) {
  const explicitCode = normalizeShortCode(product.productCode);

  if (explicitCode) {
    return explicitCode;
  }

  const shortNameCode = normalizeShortCode(product.productShortName);

  if (shortNameCode) {
    return shortNameCode;
  }

  const tokenMatch = [product.slug, product.name]
    .join(" ")
    .match(/[a-zA-Z]{1,4}\d{1,4}|\d{1,4}[a-zA-Z]{1,4}/);

  return normalizeShortCode(tokenMatch?.[0] || product.slug.split("-")[0] || product.name);
}

export function buildDefaultComicProductLock(product: ComicProductLockProduct) {
  const shortCode = deriveComicProductShortCode(product);
  const displayName = product.productShortName?.trim() || product.name;
  const slug = slugify(product.slug || displayName || shortCode);

  return {
    slug: slug || `product-${product.id}`,
    displayName,
    shortCode: shortCode || displayName.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12),
    visualNotes: [
      `Render ${shortCode || displayName} as a simple clean Neatique skincare bottle in black-and-white manga style.`,
      `The front label must show only the large readable code "${shortCode || displayName}" at center.`,
      "No ingredient fine print, claims, icons, dense packaging copy, small decorative text, or real-world brand clutter.",
      "Keep the bottle compact, polished, easy to recognize, and consistent whenever it appears."
    ].join(" "),
    usageNotes: [
      `Use this product lock when an extra story mentions ${displayName}, ${shortCode || displayName}, or product usage.`,
      "Characters are handless, so product handling should happen through gentle floating, sliding, opening, or display-like telekinesis.",
      "The product should support the scene beat without turning the page into an advertisement unless the outline asks for that tone."
    ].join(" "),
    referenceNotes: product.shortDescription
      ? `Storefront product context: ${product.shortDescription}`
      : `Storefront category: ${product.category || "Neatique skincare"}`
  };
}

export function buildComicProductLockImagePrompt(
  lock: Pick<
    ComicProductLockPromptContext,
    "displayName" | "shortCode" | "visualNotes" | "referenceNotes"
  >
) {
  return [
    `Create a locked comic product reference image for ${lock.displayName}.`,
    "Draw one single clean skincare bottle as a front-facing product design sheet.",
    "Style: Neatique original black-and-white Japanese manga, crisp ink outline, pure white background, polished simple bottle silhouette, no color.",
    "If a storefront product image is supplied as a reference, simplify its broad bottle/container shape into this manga lock while removing all small copy.",
    `Front label: render only the large centered code "${lock.shortCode}" in bold readable letters.`,
    "Do not render ingredients, claims, brand paragraphs, tiny packaging copy, decorative icons, UI chrome, watermark, signature, hands, characters, shelves, bathroom props, or extra bottles.",
    "Keep the whole bottle fully visible with generous white margin. The shape should be compact, stable, recognizable, and easy to reuse inside comic panels.",
    `Visual notes to preserve: ${lock.visualNotes}`,
    lock.referenceNotes ? `Storefront context for broad product family only, not visible text: ${lock.referenceNotes}` : null,
    "Final output: one square product reference sheet, not a comic page."
  ]
    .filter(Boolean)
    .join("\n");
}

export async function syncComicProductLocksFromActiveProducts() {
  const activeProducts = await prisma.product.findMany({
    where: {
      status: "ACTIVE"
    },
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }]
  });
  let createdCount = 0;
  let updatedCount = 0;

  for (const [index, product] of activeProducts.entries()) {
    const defaults = buildDefaultComicProductLock(product);
    const existing = await prisma.comicProductLock.findUnique({
      where: {
        productId: product.id
      }
    });

    if (existing) {
      await prisma.comicProductLock.update({
        where: {
          id: existing.id
        },
        data: {
          displayName: existing.displayName || defaults.displayName,
          shortCode: existing.shortCode || defaults.shortCode,
          slug: existing.slug || defaults.slug,
          active: true,
          sortOrder: existing.sortOrder || index
        }
      });
      updatedCount += 1;
    } else {
      await prisma.comicProductLock.create({
        data: {
          productId: product.id,
          ...defaults,
          active: true,
          sortOrder: index
        }
      });
      createdCount += 1;
    }
  }

  const activeProductIds = new Set(activeProducts.map((product) => product.id));
  const deactivated = await prisma.comicProductLock.updateMany({
    where: {
      productId: {
        notIn: Array.from(activeProductIds)
      }
    },
    data: {
      active: false
    }
  });

  return {
    activeProductCount: activeProducts.length,
    createdCount,
    updatedCount,
    deactivatedCount: deactivated.count
  };
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ");
}

function isProductLockMentioned(searchText: string, lock: ComicProductLockPromptContext) {
  const candidates = [lock.shortCode, lock.displayName, lock.slug]
    .map((value) => normalizeSearchText(value).trim())
    .filter(Boolean);

  return candidates.some((candidate) => searchText.includes(candidate));
}

export async function loadComicProductLockPromptContexts(
  referenceText?: string | null,
  options: { fallbackToAll?: boolean } = {}
) {
  const locks = await prisma.comicProductLock.findMany({
    where: {
      active: true
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  const contexts = locks.map((lock) => ({
    id: lock.id,
    displayName: lock.displayName,
    shortCode: lock.shortCode,
    slug: lock.slug,
    visualNotes: lock.visualNotes,
    usageNotes: lock.usageNotes,
    referenceNotes: lock.referenceNotes ?? null,
    imageUrl: lock.imageUrl ?? null,
    imageData: lock.imageData ?? null,
    imageMimeType: lock.imageMimeType ?? null,
    imageByteSize: lock.imageByteSize ?? null,
    imageGeneratedAt: lock.imageGeneratedAt ?? null
  }));
  const searchText = normalizeSearchText(referenceText || "");
  const mentioned = searchText
    ? contexts.filter((lock) => isProductLockMentioned(searchText, lock))
    : [];

  return mentioned.length > 0 ? mentioned : options.fallbackToAll === false ? [] : contexts;
}

function getProductLockReferenceBaseUrl() {
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const vercelBaseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";

  return (publicBaseUrl || vercelBaseUrl || "http://localhost:3000").replace(/\/+$/, "");
}

async function fetchProductLockImageData(lock: ComicProductLockPromptContext) {
  const mimeType = lock.imageMimeType || "image/png";

  if (lock.imageData) {
    const buffer = Buffer.from(lock.imageData, "base64");

    return {
      data: new Uint8Array(buffer),
      mimeType,
      sizeBytes: lock.imageByteSize || buffer.byteLength
    };
  }

  if (!lock.imageUrl) {
    return null;
  }

  const absoluteUrl = /^https?:\/\//i.test(lock.imageUrl)
    ? lock.imageUrl
    : new URL(lock.imageUrl, `${getProductLockReferenceBaseUrl()}/`).toString();

  try {
    const response = await fetch(absoluteUrl);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    return {
      data,
      mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || mimeType,
      sizeBytes: Number(response.headers.get("content-length") || data.byteLength)
    };
  } catch {
    return null;
  }
}

export async function loadComicProductLockReferenceImages(
  locks: ComicProductLockPromptContext[]
): Promise<ComicReferenceImageFile[]> {
  const images = await Promise.all(
    locks.map(async (lock) => {
      const image = await fetchProductLockImageData(lock);

      if (!image) {
        return null;
      }

      return {
        bucket: "PRODUCT_LOCK",
        label: `${lock.displayName} product lock`,
        slug: lock.slug,
        fileName: `${lock.slug}-${lock.shortCode.toLowerCase()}.${getComicImageExtension(
          image.mimeType
        )}`,
        relativePath: `comic/product-locks/${lock.slug}`,
        imageUrl: lock.imageUrl || buildComicProductLockMediaUrl(lock.id),
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        whyThisMatters: `${lock.displayName} appears in the page prompt, so this generated product reference sheet is attached as a direct visual lock.`,
        contentSummary: `Locked manga bottle reference for ${lock.displayName}; front label shows only ${lock.shortCode}.`,
        source: "auto-detected",
        data: image.data
      } satisfies ComicReferenceImageFile;
    })
  );

  return images.filter(Boolean) as ComicReferenceImageFile[];
}

export function resolveComicProductLockReferenceImages(
  locks: ComicProductLockPromptContext[]
): ComicResolvedReferenceImage[] {
  return locks
    .filter((lock) => lock.imageUrl || lock.imageData)
    .map((lock) => {
      const mimeType = lock.imageMimeType || "image/png";

      return {
        bucket: "PRODUCT_LOCK",
        label: `${lock.displayName} product lock`,
        slug: lock.slug,
        fileName: `${lock.slug}-${lock.shortCode.toLowerCase()}.${getComicImageExtension(
          mimeType
        )}`,
        relativePath: `comic/product-locks/${lock.slug}`,
        imageUrl: lock.imageUrl || buildComicProductLockMediaUrl(lock.id),
        mimeType,
        sizeBytes: lock.imageByteSize || 0,
        whyThisMatters: `${lock.displayName} appears in the page prompt, so this generated product reference sheet is attached as a direct visual lock.`,
        contentSummary: `Locked manga bottle reference for ${lock.displayName}; front label shows only ${lock.shortCode}.`,
        source: "auto-detected"
      };
    });
}

async function loadStorefrontProductReferenceImage(imageUrl: string, slug: string) {
  const absoluteUrl = /^https?:\/\//i.test(imageUrl)
    ? imageUrl
    : new URL(imageUrl, `${getProductLockReferenceBaseUrl()}/`).toString();

  try {
    const response = await fetch(absoluteUrl);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    const arrayBuffer = await response.arrayBuffer();

    return {
      mimeType: contentType,
      base64Data: Buffer.from(arrayBuffer).toString("base64"),
      fileName: `${slug}-storefront-source.${getComicImageExtension(contentType)}`
    };
  } catch {
    return null;
  }
}

export async function generateComicProductLockReferenceImage(lockId: string) {
  const lock = await prisma.comicProductLock.findUnique({
    where: {
      id: lockId
    },
    include: {
      product: {
        select: {
          imageUrl: true
        }
      }
    }
  });

  if (!lock) {
    throw new Error("Product lock could not be found.");
  }

  const prompt =
    lock.imagePrompt?.trim() ||
    buildComicProductLockImagePrompt({
      displayName: lock.displayName,
      shortCode: lock.shortCode,
      visualNotes: lock.visualNotes,
      referenceNotes: lock.referenceNotes
    });
  const { generateStandaloneComicImageWithAi } = await import("@/lib/openai-comic");
  const storefrontReferenceImage = lock.product.imageUrl
    ? await loadStorefrontProductReferenceImage(lock.product.imageUrl, lock.slug)
    : null;
  const generatedImage = await generateStandaloneComicImageWithAi({
    prompt,
    aspectRatio: "1:1",
    quality: "medium",
    referenceImages: storefrontReferenceImage ? [storefrontReferenceImage] : []
  });
  const storedImage = await storeComicImage({
    base64Data: generatedImage.base64Data,
    mimeType: generatedImage.mimeType,
    category: "product-locks",
    targetId: lock.id,
    fileName: `${lock.slug}-${lock.shortCode.toLowerCase()}-${Date.now()}`
  });
  const imageUrl = storedImage.imageData
    ? buildComicProductLockMediaUrl(lock.id)
    : storedImage.imageUrl;

  await prisma.comicProductLock.update({
    where: {
      id: lock.id
    },
    data: {
      imageUrl,
      imageData: storedImage.imageData,
      imageMimeType: storedImage.imageMimeType,
      imageStorageKey: storedImage.imageStorageKey,
      imageByteSize: storedImage.imageByteSize,
      imageSha256: storedImage.imageSha256,
      imagePrompt: prompt,
      imageGeneratedAt: new Date()
    }
  });

  return {
    id: lock.id,
    imageUrl,
    prompt
  };
}

export async function saveUploadedComicProductLockReferenceImage(input: {
  lockId: string;
  base64Data: string;
  mimeType: string;
  fileName?: string | null;
}) {
  const lock = await prisma.comicProductLock.findUnique({
    where: {
      id: input.lockId
    }
  });

  if (!lock) {
    throw new Error("Product lock could not be found.");
  }

  const storedImage = await storeComicImage({
    base64Data: input.base64Data,
    mimeType: input.mimeType,
    category: "product-locks",
    targetId: lock.id,
    fileName:
      input.fileName ||
      `${lock.slug}-${lock.shortCode.toLowerCase()}-upload-${Date.now()}`
  });
  const imageUrl = storedImage.imageData
    ? buildComicProductLockMediaUrl(lock.id)
    : storedImage.imageUrl;

  await prisma.comicProductLock.update({
    where: {
      id: lock.id
    },
    data: {
      imageUrl,
      imageData: storedImage.imageData,
      imageMimeType: storedImage.imageMimeType,
      imageStorageKey: storedImage.imageStorageKey,
      imageByteSize: storedImage.imageByteSize,
      imageSha256: storedImage.imageSha256,
      imageGeneratedAt: new Date()
    }
  });

  return {
    id: lock.id,
    imageUrl
  };
}

export function formatComicProductLockPromptContext(locks: ComicProductLockPromptContext[]) {
  if (locks.length === 0) {
    return "No product locks are currently active.";
  }

  return locks
    .map((lock) =>
      [
        `- ${lock.displayName} (${lock.shortCode}, slug: ${lock.slug})`,
        `  Image lock: ${lock.imageUrl ? "Generated comic product reference image available." : "No generated product reference image yet."}`,
        `  Visual lock: ${lock.visualNotes}`,
        `  Usage lock: ${lock.usageNotes}`,
        lock.referenceNotes ? `  Storefront note: ${lock.referenceNotes}` : null
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
}
