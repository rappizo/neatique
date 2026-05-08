import { prisma } from "@/lib/db";
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
  displayName: string;
  shortCode: string;
  slug: string;
  visualNotes: string;
  usageNotes: string;
  referenceNotes: string | null;
};

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
    displayName: lock.displayName,
    shortCode: lock.shortCode,
    slug: lock.slug,
    visualNotes: lock.visualNotes,
    usageNotes: lock.usageNotes,
    referenceNotes: lock.referenceNotes ?? null
  }));
  const searchText = normalizeSearchText(referenceText || "");
  const mentioned = searchText
    ? contexts.filter((lock) => isProductLockMentioned(searchText, lock))
    : [];

  return mentioned.length > 0 ? mentioned : options.fallbackToAll === false ? [] : contexts;
}

export function formatComicProductLockPromptContext(locks: ComicProductLockPromptContext[]) {
  if (locks.length === 0) {
    return "No product locks are currently active.";
  }

  return locks
    .map((lock) =>
      [
        `- ${lock.displayName} (${lock.shortCode}, slug: ${lock.slug})`,
        `  Visual lock: ${lock.visualNotes}`,
        `  Usage lock: ${lock.usageNotes}`,
        lock.referenceNotes ? `  Storefront note: ${lock.referenceNotes}` : null
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
}
