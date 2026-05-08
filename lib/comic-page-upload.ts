import { Buffer } from "node:buffer";
import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { buildComicMediaFallbackUrl, storeComicImage } from "@/lib/comic-image-storage";
import {
  COMIC_CHINESE_PAGE_ASSET_TYPE,
  COMIC_PAGE_ASSET_TYPES,
  COMIC_REQUIRED_PAGE_COUNT,
  formatComicPageFileSlug,
  formatComicPageLabel,
  isComicPublishPageNumber
} from "@/lib/comic-pages";
import { prisma } from "@/lib/db";

const COMIC_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

type ComicRouteSlugs = {
  seasonSlug?: string | null;
  chapterSlug?: string | null;
  episodeSlug?: string | null;
};

type UploadedComicPageAssetInput = {
  id: string;
  assetType: string;
  title: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  published: boolean;
  episodeId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ComicPageUploadStatus =
  | "page-uploaded"
  | "page-uploaded-approved"
  | "missing-episode"
  | "invalid-page-number"
  | "missing-upload"
  | "upload-too-large"
  | "upload-type"
  | "unpublish-before-approval-change";

export type UploadedComicPageAsset = UploadedComicPageAssetInput;

export type ComicPageUploadResult = {
  ok: true;
  status: "page-uploaded" | "page-uploaded-approved";
  message: string;
  episodeId: string;
  episodePublished: boolean;
  englishApprovedCount: number;
  chineseApprovedCount: number;
  requiredPageCount: number;
  canPublish: boolean;
  canPublishChinese: boolean;
  language: "en";
  pageNumber: number;
  assetId: string;
  approvedAssetId: string | null;
  approvedChineseAssetId: null;
  asset: UploadedComicPageAsset;
};

export class ComicPageUploadInputError extends Error {
  status: ComicPageUploadStatus;
  statusCode: number;

  constructor(status: ComicPageUploadStatus, message: string, statusCode = 400) {
    super(message);
    this.name = "ComicPageUploadInputError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

const uploadedAssetSelect = {
  id: true,
  assetType: true,
  title: true,
  imageUrl: true,
  altText: true,
  caption: true,
  sortOrder: true,
  published: true,
  episodeId: true,
  createdAt: true,
  updatedAt: true
} as const;

function isComicPageAssetType(assetType: string) {
  return COMIC_PAGE_ASSET_TYPES.includes(assetType);
}

function isChineseComicPageAssetType(assetType: string) {
  return assetType === COMIC_CHINESE_PAGE_ASSET_TYPE;
}

function countApprovedRequiredPages(
  assets: Array<{ assetType: string; published: boolean; sortOrder: number }>,
  language: "en" | "zh"
) {
  return new Set(
    assets
      .filter((asset) => {
        const matchesLanguage =
          language === "zh"
            ? isChineseComicPageAssetType(asset.assetType)
            : isComicPageAssetType(asset.assetType);

        return matchesLanguage && asset.published && isComicPublishPageNumber(asset.sortOrder);
      })
      .map((asset) => asset.sortOrder)
  ).size;
}

async function getEpisodeStatus(episodeId: string) {
  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      assets: {
        select: {
          assetType: true,
          published: true,
          sortOrder: true
        }
      },
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode) {
    throw new ComicPageUploadInputError("missing-episode", "That comic episode could not be found.");
  }

  const englishApprovedCount = countApprovedRequiredPages(episode.assets, "en");
  const chineseApprovedCount = countApprovedRequiredPages(episode.assets, "zh");

  return {
    episodeId: episode.id,
    episodePublished: episode.published,
    englishApprovedCount,
    chineseApprovedCount,
    requiredPageCount: COMIC_REQUIRED_PAGE_COUNT,
    canPublish: englishApprovedCount === COMIC_REQUIRED_PAGE_COUNT,
    canPublishChinese: chineseApprovedCount === COMIC_REQUIRED_PAGE_COUNT,
    slugs: {
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    } satisfies ComicRouteSlugs
  };
}

export async function uploadComicPageAsset(input: {
  episodeId: string;
  pageNumber: number;
  file: File | null;
  approveAfterUpload?: boolean;
  title?: string;
  altText?: string;
  caption?: string | null;
}): Promise<ComicPageUploadResult> {
  const episodeId = input.episodeId.trim();
  const pageNumber = input.pageNumber;
  const shouldApprove = Boolean(input.approveAfterUpload);

  if (!episodeId) {
    throw new ComicPageUploadInputError("missing-episode", "Episode is required.");
  }

  if (!isComicPublishPageNumber(pageNumber)) {
    throw new ComicPageUploadInputError(
      "invalid-page-number",
      "Choose the cover or a story page from 1 to 10 before uploading."
    );
  }

  const pageLabel = formatComicPageLabel(pageNumber);

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode) {
    throw new ComicPageUploadInputError("missing-episode", "That comic episode could not be found.");
  }

  if (!input.file || input.file.size <= 0) {
    throw new ComicPageUploadInputError("missing-upload", "Choose an image file before uploading.");
  }

  if (input.file.size > COMIC_UPLOAD_MAX_BYTES) {
    throw new ComicPageUploadInputError("upload-too-large", "Comic page uploads must stay under 20MB.");
  }

  if (!/^image\/(png|jpe?g|webp|avif)$/i.test(input.file.type)) {
    throw new ComicPageUploadInputError("upload-type", "Upload PNG, JPG, WEBP, or AVIF images only.");
  }

  if (shouldApprove && episode.published) {
    throw new ComicPageUploadInputError(
      "unpublish-before-approval-change",
      "Unpublish this episode before changing approvals.",
      409
    );
  }

  const imageBuffer = Buffer.from(await input.file.arrayBuffer());
  const storedImage = await storeComicImage({
    base64Data: imageBuffer.toString("base64"),
    mimeType: input.file.type || "image/png",
    category: "uploaded-pages",
    targetId: episodeId,
    fileName: `${formatComicPageFileSlug(pageNumber)}-${Date.now()}`
  });
  const createdAsset = await prisma.comicEpisodeAsset.create({
    data: {
      episodeId,
      assetType: "UPLOADED_PAGE",
      title: input.title || `${episode.title} - Uploaded ${pageLabel}`,
      imageUrl: storedImage.imageUrl,
      imageData: storedImage.imageData,
      imageMimeType: storedImage.imageMimeType,
      imageStorageKey: storedImage.imageStorageKey,
      imageByteSize: storedImage.imageByteSize,
      imageSha256: storedImage.imageSha256,
      altText: input.altText || `${episode.title} uploaded comic ${pageLabel.toLowerCase()}`,
      caption: input.caption || null,
      sortOrder: pageNumber,
      published: shouldApprove
    },
    select: uploadedAssetSelect
  });
  const imageUrl = storedImage.imageData
    ? buildComicMediaFallbackUrl(createdAsset.id)
    : storedImage.imageUrl;
  let uploadedAsset: UploadedComicPageAsset;

  if (shouldApprove) {
    const transactionResult = await prisma.$transaction([
      prisma.comicEpisodeAsset.updateMany({
        where: {
          episodeId,
          sortOrder: pageNumber,
          id: { not: createdAsset.id },
          assetType: { in: COMIC_PAGE_ASSET_TYPES }
        },
        data: {
          published: false
        }
      }),
      prisma.comicEpisodeAsset.updateMany({
        where: {
          episodeId,
          sortOrder: pageNumber,
          assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
        },
        data: {
          published: false
        }
      }),
      prisma.comicEpisodeAsset.update({
        where: { id: createdAsset.id },
        data: {
          imageUrl,
          published: true
        },
        select: uploadedAssetSelect
      })
    ]);

    uploadedAsset = transactionResult[2];
  } else {
    uploadedAsset = await prisma.comicEpisodeAsset.update({
      where: { id: createdAsset.id },
      data: {
        imageUrl
      },
      select: uploadedAssetSelect
    });
  }

  const { slugs, ...status } = await getEpisodeStatus(episodeId);
  revalidateComicRoutes(slugs);

  return {
    ...status,
    ok: true,
    status: shouldApprove ? "page-uploaded-approved" : "page-uploaded",
    message: shouldApprove
      ? `${pageLabel} uploaded and approved.`
      : `${pageLabel} uploaded as a draft candidate.`,
    language: "en",
    pageNumber,
    assetId: uploadedAsset.id,
    approvedAssetId: shouldApprove ? uploadedAsset.id : null,
    approvedChineseAssetId: null,
    asset: uploadedAsset
  };
}
