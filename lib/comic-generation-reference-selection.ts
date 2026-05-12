import { loadComicCharacterIdentityLocks } from "@/lib/comic-character-identity";
import type { StoredPromptUpload } from "@/lib/comic-prompt-output";
import {
  loadComicReferenceImageFiles,
  normalizeComicReferenceImageOverrides,
  resolveComicPageReferenceImages,
  type ComicReferenceImageFile,
  type ComicResolvedReferenceImage
} from "@/lib/comic-reference-images";
import {
  loadComicProductLockPromptContexts,
  loadComicProductLockReferenceImages,
  type ComicProductLockPromptContext
} from "@/lib/comic-product-locks";

type ComicReferenceSelectionMode = "auto" | "manual";

type ResolveComicGenerationReferenceSelectionInput = {
  requiredUploads: StoredPromptUpload[];
  seasonSlug: string;
  chapterSlug: string;
  referenceDetectionText: string;
  productDetectionText: string;
  referenceImageOverrides?: unknown;
};

export type ComicGenerationReferenceSelection = {
  mode: ComicReferenceSelectionMode;
  resolvedReferenceImages: ComicResolvedReferenceImage[];
  referenceImages: ComicReferenceImageFile[];
  characterLocks: Awaited<ReturnType<typeof loadComicCharacterIdentityLocks>>;
  productLocks: ComicProductLockPromptContext[];
};

function isCharacterReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "CHARACTER" || reference.bucket === "DETECTED_CHARACTER";
}

function isProductLockReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "PRODUCT_LOCK";
}

function mergeProductLocks(productLocks: ComicProductLockPromptContext[]) {
  const bySlug = new Map<string, ComicProductLockPromptContext>();

  for (const productLock of productLocks) {
    if (!bySlug.has(productLock.slug)) {
      bySlug.set(productLock.slug, productLock);
    }
  }

  return Array.from(bySlug.values());
}

export async function resolveComicGenerationReferenceSelection(
  input: ResolveComicGenerationReferenceSelectionInput
): Promise<ComicGenerationReferenceSelection> {
  const manualReferenceImages = normalizeComicReferenceImageOverrides(
    input.referenceImageOverrides
  );
  const hasManualReferenceImages = manualReferenceImages !== null;
  const productDetectionText = input.productDetectionText || input.referenceDetectionText;
  const autoReferencesPromise = hasManualReferenceImages
    ? Promise.resolve<ComicResolvedReferenceImage[]>([])
    : resolveComicPageReferenceImages({
        requiredUploads: input.requiredUploads,
        seasonSlug: input.seasonSlug,
        chapterSlug: input.chapterSlug,
        promptText: input.referenceDetectionText
      });
  const detectedProductLocksPromise = loadComicProductLockPromptContexts(productDetectionText, {
    fallbackToAll: false
  });
  const manualProductSlugs = new Set(
    (manualReferenceImages || [])
      .filter(isProductLockReference)
      .map((reference) => reference.slug)
      .filter(Boolean)
  );
  const allProductLocksPromise =
    hasManualReferenceImages && manualProductSlugs.size > 0
      ? loadComicProductLockPromptContexts("", { fallbackToAll: true })
      : Promise.resolve<ComicProductLockPromptContext[]>([]);
  const [autoReferences, detectedProductLocks, allProductLocks] = await Promise.all([
    autoReferencesPromise,
    detectedProductLocksPromise,
    allProductLocksPromise
  ]);
  const resolvedReferenceImages = hasManualReferenceImages
    ? manualReferenceImages
    : autoReferences;
  const baseResolvedReferenceImages = resolvedReferenceImages.filter(
    (reference) => !isProductLockReference(reference)
  );
  const selectedProductLocks = hasManualReferenceImages
    ? allProductLocks.filter((productLock) => manualProductSlugs.has(productLock.slug))
    : detectedProductLocks;
  const productLocks = hasManualReferenceImages
    ? mergeProductLocks([...detectedProductLocks, ...selectedProductLocks])
    : detectedProductLocks;
  const [baseReferenceImages, characterLocks, productReferenceImages] = await Promise.all([
    loadComicReferenceImageFiles(baseResolvedReferenceImages),
    loadComicCharacterIdentityLocks(
      baseResolvedReferenceImages.filter(isCharacterReference).map((reference) => reference.slug)
    ),
    loadComicProductLockReferenceImages(selectedProductLocks)
  ]);

  return {
    mode: hasManualReferenceImages ? "manual" : "auto",
    resolvedReferenceImages,
    referenceImages: [...baseReferenceImages, ...productReferenceImages],
    characterLocks,
    productLocks
  };
}
