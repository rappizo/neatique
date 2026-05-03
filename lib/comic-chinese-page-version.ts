import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { prisma } from "@/lib/db";

const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];
const COMIC_CHINESE_PAGE_ASSET_TYPE = "CHINESE_PAGE";
const COMIC_PUBLISH_PAGE_COUNT = 10;

export type ComicChinesePageVersionStatus =
  | "page-chinese-created"
  | "page-chinese-failed"
  | "missing-approved-page"
  | "missing-asset"
  | "missing-source-image";

export class ComicChinesePageVersionInputError extends Error {
  status: ComicChinesePageVersionStatus;

  constructor(status: ComicChinesePageVersionStatus, message: string) {
    super(message);
    this.name = "ComicChinesePageVersionInputError";
    this.status = status;
  }
}

export type ComicChinesePageVersionResult = {
  ok: boolean;
  status: ComicChinesePageVersionStatus;
  sourceAssetId: string;
  episodeId: string;
  pageNumber: number;
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

function getComicModel() {
  return (
    process.env.OPENAI_COMIC_MODEL ||
    process.env.OPENAI_POST_MODEL ||
    process.env.OPENAI_EMAIL_MODEL ||
    "gpt-5.5"
  );
}

function getComicImageModel() {
  return process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2";
}

export async function createChineseComicPageVersion(input: {
  assetId: string;
}): Promise<ComicChinesePageVersionResult> {
  const assetId = input.assetId.trim();

  if (!assetId) {
    throw new ComicChinesePageVersionInputError("missing-asset", "Comic page asset is required.");
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

  if (!asset) {
    throw new ComicChinesePageVersionInputError(
      "missing-asset",
      "That comic page asset could not be found."
    );
  }

  if (!asset.published || !isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicChinesePageVersionInputError(
      "missing-approved-page",
      "Approve an English page image before creating a Chinese version."
    );
  }

  if (!asset.imageData) {
    throw new ComicChinesePageVersionInputError(
      "missing-source-image",
      "This page image does not have stored image data for AI editing."
    );
  }

  const inputContext = JSON.stringify(
    {
      episode: asset.episode.title,
      pageNumber: asset.sortOrder,
      sourceAssetId: asset.id,
      sourceAssetType: asset.assetType
    },
    null,
    2
  );

  try {
    const { generateChineseComicPageVersionWithAi } = await import("@/lib/openai-comic");
    const translatedImage = await generateChineseComicPageVersionWithAi({
      sourceImage: {
        mimeType: asset.imageMimeType || "image/png",
        base64Data: asset.imageData,
        fileName: `${asset.id}.png`
      },
      episodeTitle: asset.episode.title,
      pageNumber: asset.sortOrder
    });

    const createdAsset = await prisma.comicEpisodeAsset.create({
      data: {
        episodeId: asset.episodeId,
        assetType: COMIC_CHINESE_PAGE_ASSET_TYPE,
        title: `${asset.title} - Chinese Version`,
        imageUrl: "/media/comic/pending",
        imageData: translatedImage.base64Data,
        imageMimeType: translatedImage.mimeType,
        altText: `${asset.altText || asset.title} Chinese version`,
        caption: asset.caption,
        sortOrder: asset.sortOrder,
        published: false
      },
      select: {
        id: true
      }
    });
    const imageUrl = `/media/comic/${createdAsset.id}?v=${Date.now()}`;

    await prisma.$transaction([
      prisma.comicEpisodeAsset.update({
        where: { id: createdAsset.id },
        data: { imageUrl }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId: asset.episodeId,
          promptType: "PAGE_CHINESE_VERSION",
          model: getComicModel(),
          imageModel: getComicImageModel(),
          status: "READY",
          inputContext,
          outputSummary: `Created Chinese draft version for ${asset.episode.title} page ${asset.sortOrder}.`
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
      status: "page-chinese-created",
      sourceAssetId: asset.id,
      episodeId: asset.episodeId,
      pageNumber: asset.sortOrder,
      assetId: createdAsset.id,
      imageUrl,
      message: `Created Chinese draft for ${asset.episode.title} page ${asset.sortOrder}.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Chinese comic page creation error.";

    await prisma.comicPromptRun.create({
      data: {
        episodeId: asset.episodeId,
        promptType: "PAGE_CHINESE_VERSION",
        model: getComicModel(),
        imageModel: getComicImageModel(),
        status: "FAILED",
        inputContext,
        outputSummary: `Chinese version creation failed for page ${asset.sortOrder}.`,
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
      status: "page-chinese-failed",
      sourceAssetId: asset.id,
      episodeId: asset.episodeId,
      pageNumber: asset.sortOrder,
      message: `Chinese version creation failed for page ${asset.sortOrder}.`,
      errorMessage
    };
  }
}
