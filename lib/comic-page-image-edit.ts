import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { isNextRedirectError } from "@/lib/comic-action-errors";
import {
  buildComicMediaFallbackUrl,
  getComicImageSource,
  storeComicImage
} from "@/lib/comic-image-storage";
import { loadComicCharacterIdentityLocks } from "@/lib/comic-character-identity";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import {
  loadComicReferenceImageFiles,
  resolveComicPageReferenceImages
} from "@/lib/comic-reference-images";
import {
  loadComicProductLockPromptContexts,
  loadComicProductLockReferenceImages
} from "@/lib/comic-product-locks";
import { prisma } from "@/lib/db";
import {
  COMIC_PAGE_ASSET_TYPES,
  formatComicPageFileSlug,
  formatComicPageLabel,
  isComicPublishPageNumber
} from "@/lib/comic-pages";
import { createComicTaskTimer, type ComicTaskTiming } from "@/lib/comic-task-timing";


export type ComicPageImageEditStatus =
  | "page-edit-created"
  | "page-edit-failed"
  | "missing-asset"
  | "missing-source-image"
  | "missing-page-edit-instruction";

export class ComicPageImageEditInputError extends Error {
  status: ComicPageImageEditStatus;

  constructor(status: ComicPageImageEditStatus, message: string) {
    super(message);
    this.name = "ComicPageImageEditInputError";
    this.status = status;
  }
}

export type ComicPageImageEditResult = {
  ok: boolean;
  status: ComicPageImageEditStatus;
  pageNumber: number;
  episodeId: string;
  sourceAssetId: string;
  assetId?: string;
  imageUrl?: string;
  timing?: ComicTaskTiming;
  message: string;
  errorMessage?: string;
};

function isComicPageAssetType(assetType: string) {
  return COMIC_PAGE_ASSET_TYPES.includes(assetType);
}

export async function editComicPageImageForAsset(input: {
  assetId: string;
  editInstruction: string;
  attempt?: number;
}): Promise<ComicPageImageEditResult> {
  const assetId = input.assetId.trim();
  const editInstruction = input.editInstruction.trim();
  const attempt = Math.max(input.attempt || 1, 1);
  const timer = createComicTaskTimer();

  if (!assetId) {
    throw new ComicPageImageEditInputError("missing-asset", "Comic page asset is required.");
  }

  if (!editInstruction) {
    throw new ComicPageImageEditInputError(
      "missing-page-edit-instruction",
      "Enter an edit instruction before editing this page image."
    );
  }

  const asset = await timer.time("loadAsset", () =>
    prisma.comicEpisodeAsset.findUnique({
      where: { id: assetId },
      include: {
        episode: {
          include: {
            chapter: {
              include: {
                season: {
                  include: {
                    project: true
                  }
                }
              }
            }
          }
        }
      }
    })
  );

  if (!asset || !isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicPageImageEditInputError("missing-asset", "That comic page asset could not be found.");
  }

  const sourceImage = await timer.time("loadSourceImage", () => getComicImageSource(asset));

  if (!sourceImage) {
    throw new ComicPageImageEditInputError(
      "missing-source-image",
      "This page image does not have readable source image data for AI editing."
    );
  }

  const parsedPromptOutput = parseComicPromptOutput(
    asset.episode.promptPack,
    asset.episode.requiredReferences
  );
  const page = parsedPromptOutput?.pages.find(
    (candidate) => candidate.pageNumber === asset.sortOrder
  );
  const referenceDetectionText = page
    ? [
        page.pagePurpose,
        page.panels
          .map((panel) =>
            [
              panel.panelTitle,
              panel.storyBeat,
              panel.promptText || "",
              panel.dialogueLines?.map((line) => `${line.speaker}: ${line.text}`).join("\n")
            ]
              .filter(Boolean)
              .join("\n")
          )
          .join("\n\n"),
        page.requiredUploads
          .map((upload) => [upload.label, upload.slug, upload.contentSummary].join(" "))
          .join("\n")
      ].join("\n\n")
    : "";
  const resolvedReferenceImages = page
    ? await timer.time("resolveReferences", () =>
        resolveComicPageReferenceImages({
          requiredUploads: page.requiredUploads,
          seasonSlug: asset.episode.chapter.season.slug,
          chapterSlug: asset.episode.chapter.slug,
          promptText: referenceDetectionText
        })
      )
    : [];
  const [baseReferenceImages, characterLocks, productLocks] = await timer.time(
    "loadReferenceContexts",
    () =>
      Promise.all([
        loadComicReferenceImageFiles(resolvedReferenceImages),
        loadComicCharacterIdentityLocks(
          resolvedReferenceImages
            .filter((reference) => ["CHARACTER", "DETECTED_CHARACTER"].includes(reference.bucket))
            .map((reference) => reference.slug)
        ),
        loadComicProductLockPromptContexts(
          page
            ? [
                page.pagePurpose,
                page.promptPackCopyText,
                page.referenceNotesCopyText,
                referenceDetectionText
              ].join("\n")
            : referenceDetectionText,
          {
            fallbackToAll: false
          }
        )
      ])
  );
  const productReferenceImages = await timer.time("loadProductReferences", () =>
    loadComicProductLockReferenceImages(productLocks)
  );
  const referenceImages = [...baseReferenceImages, ...productReferenceImages];
  const inputContext = JSON.stringify(
    {
      episode: asset.episode.title,
      pageNumber: asset.sortOrder,
      sourceAssetId: asset.id,
      sourceAssetType: asset.assetType,
      sourceAssetTitle: asset.title,
      editInstruction,
      attempt,
      referenceImages: referenceImages.map((reference) => ({
        label: reference.label,
        fileName: reference.fileName,
        relativePath: reference.relativePath,
        source: reference.source,
        bucket: reference.bucket
      })),
      characterLocks: characterLocks.map((character) => ({
        slug: character.slug,
        name: character.name,
        chineseName: character.chineseName,
        referenceFiles: character.referenceFiles.map((file) => file.fileName),
        hasProfileMarkdown: Boolean(character.profileMarkdown)
      })),
      productLocks: productLocks.map((productLock) => ({
        slug: productLock.slug,
        displayName: productLock.displayName,
        shortCode: productLock.shortCode,
        hasReferenceImage: Boolean(productLock.imageUrl)
      })),
      currentPage: page
        ? {
            pagePurpose: page.pagePurpose,
            panelCount: page.panelCount,
            promptPackCopyText: page.promptPackCopyText,
            referenceNotesCopyText: page.referenceNotesCopyText,
            panels: page.panels
          }
        : null
    },
    null,
    2
  );

  try {
    const { editComicPageImageWithAi } = await import("@/lib/openai-comic");
    const editedImage = await timer.time("openAiImageEdit", () =>
      editComicPageImageWithAi({
        sourceImage,
        episodeTitle: asset.episode.title,
        pageNumber: asset.sortOrder,
        editInstruction,
        pageContext: page
          ? {
              pagePurpose: page.pagePurpose,
              promptPackCopyText: page.promptPackCopyText,
              referenceNotesCopyText: page.referenceNotesCopyText,
              panels: page.panels.map((panel) => ({
                pageNumber: page.pageNumber,
                ...panel,
                promptText: panel.promptText || panel.storyBeat,
                dialogueLines: panel.dialogueLines || []
              }))
            }
          : null,
        referenceImages,
        characterLocks,
        productLocks,
        attempt
      })
    );
    const storedImage = await timer.time("storeImage", () =>
      storeComicImage({
        base64Data: editedImage.base64Data,
        mimeType: editedImage.mimeType,
        category: "edited-pages",
        targetId: asset.episodeId,
        fileName: `${formatComicPageFileSlug(asset.sortOrder)}-edit-${Date.now()}`
      })
    );

    const createdAsset = await timer.time("createAsset", () =>
      prisma.comicEpisodeAsset.create({
        data: {
          episodeId: asset.episodeId,
          assetType: "GENERATED_PAGE",
          title: `${asset.episode.title} - ${formatComicPageLabel(asset.sortOrder)} Edit`,
          imageUrl: storedImage.imageUrl,
          imageData: storedImage.imageData,
          imageMimeType: storedImage.imageMimeType,
          imageStorageKey: storedImage.imageStorageKey,
          imageByteSize: storedImage.imageByteSize,
          imageSha256: storedImage.imageSha256,
          altText: `${asset.episode.title} comic ${formatComicPageLabel(asset.sortOrder).toLowerCase()} edited candidate`,
          caption: editInstruction,
          sortOrder: asset.sortOrder,
          published: false
        },
        select: {
          id: true
        }
      })
    );
    const imageUrl = storedImage.imageData
      ? buildComicMediaFallbackUrl(createdAsset.id)
      : storedImage.imageUrl;

    await timer.time("writePromptRun", () =>
      prisma.$transaction([
        prisma.comicEpisodeAsset.update({
          where: { id: createdAsset.id },
          data: { imageUrl }
        }),
        prisma.comicPromptRun.create({
          data: {
            episodeId: asset.episodeId,
            promptType: "PAGE_IMAGE_EDIT",
          model: process.env.AI_TEXT_MODEL || "gpt-5.4-mini",
          imageModel: process.env.AI_IMAGE_MODEL || "gemini-3.1-flash-image",
            status: "READY",
            inputContext,
            outputSummary: `Edited ${asset.episode.title} ${formatComicPageLabel(asset.sortOrder).toLowerCase()} from an existing page candidate with ${referenceImages.length} continuity reference image${referenceImages.length === 1 ? "" : "s"}.`,
            promptPack: editInstruction
          }
        })
      ])
    );

    revalidateComicRoutes({
      seasonSlug: asset.episode.chapter.season.slug,
      chapterSlug: asset.episode.chapter.slug,
      episodeSlug: asset.episode.slug
    });

    return {
      ok: true,
      status: "page-edit-created",
      episodeId: asset.episodeId,
      pageNumber: asset.sortOrder,
      sourceAssetId: asset.id,
      assetId: createdAsset.id,
      imageUrl,
      timing: timer.snapshot(),
      message: `Edited ${asset.episode.title} ${formatComicPageLabel(asset.sortOrder).toLowerCase()}.`
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown comic page image edit error.";

    await timer.time("writeFailedPromptRun", () =>
      prisma.comicPromptRun.create({
        data: {
          episodeId: asset.episodeId,
          promptType: "PAGE_IMAGE_EDIT",
          model: process.env.AI_TEXT_MODEL || "gpt-5.4-mini",
          imageModel: process.env.AI_IMAGE_MODEL || "gemini-3.1-flash-image",
          status: "FAILED",
          inputContext,
          outputSummary: `${formatComicPageLabel(asset.sortOrder)} image edit failed.`,
          promptPack: editInstruction,
          errorMessage
        }
      })
    );

    revalidateComicRoutes({
      seasonSlug: asset.episode.chapter.season.slug,
      chapterSlug: asset.episode.chapter.slug,
      episodeSlug: asset.episode.slug
    });

    return {
      ok: false,
      status: "page-edit-failed",
      episodeId: asset.episodeId,
      pageNumber: asset.sortOrder,
      sourceAssetId: asset.id,
      timing: timer.snapshot(),
      message: `${formatComicPageLabel(asset.sortOrder)} image edit failed.`,
      errorMessage
    };
  }
}
