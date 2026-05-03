import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { isNextRedirectError } from "@/lib/comic-action-errors";
import {
  buildComicMediaFallbackUrl,
  getComicImageSource,
  storeComicImage
} from "@/lib/comic-image-storage";
import { prisma } from "@/lib/db";

const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];
const COMIC_PUBLISH_PAGE_COUNT = 10;

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
  message: string;
  errorMessage?: string;
};

function isComicPageAssetType(assetType: string) {
  return COMIC_PAGE_ASSET_TYPES.includes(assetType);
}

function isComicPublishPageNumber(pageNumber: number) {
  return Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= COMIC_PUBLISH_PAGE_COUNT;
}

export async function editComicPageImageForAsset(input: {
  assetId: string;
  editInstruction: string;
}): Promise<ComicPageImageEditResult> {
  const assetId = input.assetId.trim();
  const editInstruction = input.editInstruction.trim();

  if (!assetId) {
    throw new ComicPageImageEditInputError("missing-asset", "Comic page asset is required.");
  }

  if (!editInstruction) {
    throw new ComicPageImageEditInputError(
      "missing-page-edit-instruction",
      "Enter an edit instruction before editing this page image."
    );
  }

  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id: assetId },
    include: {
      episode: {
        include: {
          chapter: {
            include: {
              season: true
            }
          }
        }
      }
    }
  });

  if (!asset || !isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicPageImageEditInputError("missing-asset", "That comic page asset could not be found.");
  }

  const sourceImage = await getComicImageSource(asset);

  if (!sourceImage) {
    throw new ComicPageImageEditInputError(
      "missing-source-image",
      "This page image does not have readable source image data for AI editing."
    );
  }

  const inputContext = JSON.stringify(
    {
      episode: asset.episode.title,
      pageNumber: asset.sortOrder,
      sourceAssetId: asset.id,
      sourceAssetType: asset.assetType,
      sourceAssetTitle: asset.title,
      editInstruction
    },
    null,
    2
  );

  try {
    const { editComicPageImageWithAi } = await import("@/lib/openai-comic");
    const editedImage = await editComicPageImageWithAi({
      sourceImage,
      episodeTitle: asset.episode.title,
      pageNumber: asset.sortOrder,
      editInstruction
    });
    const storedImage = await storeComicImage({
      base64Data: editedImage.base64Data,
      mimeType: editedImage.mimeType,
      category: "edited-pages",
      targetId: asset.episodeId,
      fileName: `page-${String(asset.sortOrder).padStart(2, "0")}-edit-${Date.now()}`
    });

    const createdAsset = await prisma.comicEpisodeAsset.create({
      data: {
        episodeId: asset.episodeId,
        assetType: "GENERATED_PAGE",
        title: `${asset.episode.title} - Page ${String(asset.sortOrder).padStart(2, "0")} Edit`,
        imageUrl: storedImage.imageUrl,
        imageData: storedImage.imageData,
        imageMimeType: storedImage.imageMimeType,
        imageStorageKey: storedImage.imageStorageKey,
        imageByteSize: storedImage.imageByteSize,
        imageSha256: storedImage.imageSha256,
        altText: `${asset.episode.title} comic page ${asset.sortOrder} edited candidate`,
        caption: editInstruction,
        sortOrder: asset.sortOrder,
        published: false
      },
      select: {
        id: true
      }
    });
    const imageUrl = storedImage.imageData
      ? buildComicMediaFallbackUrl(createdAsset.id)
      : storedImage.imageUrl;

    await prisma.$transaction([
      prisma.comicEpisodeAsset.update({
        where: { id: createdAsset.id },
        data: { imageUrl }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId: asset.episodeId,
          promptType: "PAGE_IMAGE_EDIT",
          model:
            process.env.OPENAI_COMIC_MODEL ||
            process.env.OPENAI_POST_MODEL ||
            process.env.OPENAI_EMAIL_MODEL ||
            "gpt-5.5",
          imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
          status: "READY",
          inputContext,
          outputSummary: `Edited ${asset.episode.title} page ${asset.sortOrder} from an existing page candidate.`,
          promptPack: editInstruction
        }
      })
    ]);

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
      message: `Edited ${asset.episode.title} page ${asset.sortOrder}.`
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown comic page image edit error.";

    await prisma.comicPromptRun.create({
      data: {
        episodeId: asset.episodeId,
        promptType: "PAGE_IMAGE_EDIT",
        model:
          process.env.OPENAI_COMIC_MODEL ||
          process.env.OPENAI_POST_MODEL ||
          process.env.OPENAI_EMAIL_MODEL ||
          "gpt-5.5",
        imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
        status: "FAILED",
        inputContext,
        outputSummary: `Page ${asset.sortOrder} image edit failed.`,
        promptPack: editInstruction,
        errorMessage
      }
    });

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
      message: `Page ${asset.sortOrder} image edit failed.`,
      errorMessage
    };
  }
}
