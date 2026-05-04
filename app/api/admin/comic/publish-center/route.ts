import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const COMIC_PUBLISH_PAGE_COUNT = 10;
const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];
const COMIC_CHINESE_PAGE_ASSET_TYPE = "CHINESE_PAGE";

type PublishCenterIntent =
  | "approve-asset"
  | "unapprove-asset"
  | "approve-chinese-asset"
  | "unapprove-chinese-asset"
  | "publish-episode"
  | "unpublish-episode";

type ComicRouteSlugs = {
  seasonSlug?: string | null;
  chapterSlug?: string | null;
  episodeSlug?: string | null;
};

class ComicPublishCenterError extends Error {
  status: string;
  statusCode: number;

  constructor(status: string, message: string, statusCode = 400) {
    super(message);
    this.name = "ComicPublishCenterError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

function isComicPageAssetType(assetType: string) {
  return COMIC_PAGE_ASSET_TYPES.includes(assetType);
}

function isChineseComicPageAssetType(assetType: string) {
  return assetType === COMIC_CHINESE_PAGE_ASSET_TYPE;
}

function isComicPublishPageNumber(pageNumber: number) {
  return pageNumber >= 1 && pageNumber <= COMIC_PUBLISH_PAGE_COUNT;
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

function revalidateComicRoutes(slugs?: ComicRouteSlugs) {
  const paths = [
    "/admin/comic",
    "/admin/comic/publish-center",
    "/comic",
    slugs?.seasonSlug ? `/comic/${slugs.seasonSlug}` : null,
    slugs?.seasonSlug && slugs?.chapterSlug
      ? `/comic/${slugs.seasonSlug}/${slugs.chapterSlug}`
      : null,
    slugs?.seasonSlug && slugs?.chapterSlug && slugs?.episodeSlug
      ? `/comic/${slugs.seasonSlug}/${slugs.chapterSlug}/${slugs.episodeSlug}`
      : null
  ].filter(Boolean) as string[];

  paths.forEach((path) => {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(
        `Skipped comic route revalidation for ${path}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  });
}

async function getEpisodeStatus(episodeId: string) {
  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      assets: {
        select: {
          id: true,
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
    throw new ComicPublishCenterError("missing-episode", "That comic episode could not be found.");
  }

  const englishApprovedCount = countApprovedRequiredPages(episode.assets, "en");
  const chineseApprovedCount = countApprovedRequiredPages(episode.assets, "zh");

  return {
    episodeId: episode.id,
    episodePublished: episode.published,
    englishApprovedCount,
    chineseApprovedCount,
    requiredPageCount: COMIC_PUBLISH_PAGE_COUNT,
    canPublish: englishApprovedCount === COMIC_PUBLISH_PAGE_COUNT,
    canPublishChinese: chineseApprovedCount === COMIC_PUBLISH_PAGE_COUNT,
    slugs: {
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    }
  };
}

async function approveEnglishAsset(assetId: string) {
  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id: assetId },
    include: {
      episode: true
    }
  });

  if (!asset) {
    throw new ComicPublishCenterError("missing-asset", "That comic page asset could not be found.");
  }

  if (!isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicPublishCenterError("missing-asset", "That comic page asset cannot be approved.");
  }

  if (asset.episode.published) {
    throw new ComicPublishCenterError(
      "unpublish-before-approval-change",
      "Unpublish this episode before changing approved comic pages.",
      409
    );
  }

  await prisma.$transaction([
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        id: { not: asset.id },
        assetType: { in: COMIC_PAGE_ASSET_TYPES }
      },
      data: { published: false }
    }),
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
      },
      data: { published: false }
    }),
    prisma.comicEpisodeAsset.update({
      where: { id: asset.id },
      data: { published: true }
    })
  ]);

  const status = await getEpisodeStatus(asset.episodeId);
  revalidateComicRoutes(status.slugs);

  return {
    ...status,
    ok: true,
    status: "page-approved",
    language: "en",
    pageNumber: asset.sortOrder,
    assetId: asset.id,
    approvedAssetId: asset.id,
    approvedChineseAssetId: null
  };
}

async function unapproveEnglishAsset(assetId: string) {
  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id: assetId },
    include: {
      episode: true
    }
  });

  if (!asset) {
    throw new ComicPublishCenterError("missing-asset", "That comic page asset could not be found.");
  }

  if (!isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicPublishCenterError("missing-asset", "That comic page asset cannot be unapproved.");
  }

  if (asset.episode.published) {
    throw new ComicPublishCenterError(
      "unpublish-before-approval-change",
      "Unpublish this episode before changing approved comic pages.",
      409
    );
  }

  await prisma.$transaction([
    prisma.comicEpisodeAsset.update({
      where: { id: asset.id },
      data: { published: false }
    }),
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
      },
      data: { published: false }
    })
  ]);

  const status = await getEpisodeStatus(asset.episodeId);
  revalidateComicRoutes(status.slugs);

  return {
    ...status,
    ok: true,
    status: "page-unapproved",
    language: "en",
    pageNumber: asset.sortOrder,
    assetId: asset.id,
    approvedAssetId: null,
    approvedChineseAssetId: null
  };
}

async function approveChineseAsset(assetId: string) {
  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id: assetId },
    include: {
      episode: {
        include: {
          assets: {
            where: {
              published: true,
              assetType: { in: COMIC_PAGE_ASSET_TYPES }
            },
            select: {
              sortOrder: true
            }
          }
        }
      }
    }
  });

  if (!asset) {
    throw new ComicPublishCenterError("missing-asset", "That comic page asset could not be found.");
  }

  if (!isChineseComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicPublishCenterError("missing-asset", "That Chinese comic page cannot be approved.");
  }

  if (asset.episode.published) {
    throw new ComicPublishCenterError(
      "unpublish-before-approval-change",
      "Unpublish this episode before changing approved comic pages.",
      409
    );
  }

  const hasApprovedEnglishPage = asset.episode.assets.some(
    (candidate) => candidate.sortOrder === asset.sortOrder
  );

  if (!hasApprovedEnglishPage) {
    throw new ComicPublishCenterError(
      "missing-approved-page",
      "Approve an English page image before approving the Chinese version."
    );
  }

  await prisma.$transaction([
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        id: { not: asset.id },
        assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
      },
      data: { published: false }
    }),
    prisma.comicEpisodeAsset.update({
      where: { id: asset.id },
      data: { published: true }
    })
  ]);

  const status = await getEpisodeStatus(asset.episodeId);
  revalidateComicRoutes(status.slugs);

  return {
    ...status,
    ok: true,
    status: "page-chinese-approved",
    language: "zh",
    pageNumber: asset.sortOrder,
    assetId: asset.id,
    approvedAssetId: asset.id,
    approvedChineseAssetId: asset.id
  };
}

async function unapproveChineseAsset(assetId: string) {
  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id: assetId },
    include: {
      episode: true
    }
  });

  if (!asset) {
    throw new ComicPublishCenterError("missing-asset", "That comic page asset could not be found.");
  }

  if (!isChineseComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    throw new ComicPublishCenterError("missing-asset", "That Chinese comic page cannot be unapproved.");
  }

  if (asset.episode.published) {
    throw new ComicPublishCenterError(
      "unpublish-before-approval-change",
      "Unpublish this episode before changing approved comic pages.",
      409
    );
  }

  await prisma.comicEpisodeAsset.update({
    where: { id: asset.id },
    data: { published: false }
  });

  const status = await getEpisodeStatus(asset.episodeId);
  revalidateComicRoutes(status.slugs);

  return {
    ...status,
    ok: true,
    status: "page-chinese-unapproved",
    language: "zh",
    pageNumber: asset.sortOrder,
    assetId: asset.id,
    approvedAssetId: null,
    approvedChineseAssetId: null
  };
}

async function publishEpisode(episodeId: string) {
  if (!episodeId) {
    throw new ComicPublishCenterError("missing-episode", "Comic episode is required.");
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      assets: {
        where: {
          published: true,
          assetType: { in: COMIC_PAGE_ASSET_TYPES }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode) {
    throw new ComicPublishCenterError("missing-episode", "That comic episode could not be found.");
  }

  const approvedPageNumbers = new Set(
    episode.assets
      .filter((asset) => isComicPageAssetType(asset.assetType) && isComicPublishPageNumber(asset.sortOrder))
      .map((asset) => asset.sortOrder)
  );
  const hasAllRequiredPages = Array.from(
    { length: COMIC_PUBLISH_PAGE_COUNT },
    (_, index) => index + 1
  ).every((pageNumber) => approvedPageNumbers.has(pageNumber));

  if (!hasAllRequiredPages) {
    throw new ComicPublishCenterError(
      "missing-approved-pages",
      "Approve pages 1-10 before publishing this episode."
    );
  }

  const firstPageAsset = episode.assets[0];

  await prisma.$transaction([
    prisma.comicSeason.update({
      where: { id: episode.chapter.seasonId },
      data: { published: true }
    }),
    prisma.comicChapter.update({
      where: { id: episode.chapterId },
      data: { published: true }
    }),
    prisma.comicEpisode.update({
      where: { id: episode.id },
      data: {
        published: true,
        publishedAt: episode.publishedAt || new Date(),
        coverImageUrl: episode.coverImageUrl || firstPageAsset?.imageUrl || null,
        coverImageAlt:
          episode.coverImageAlt ||
          firstPageAsset?.altText ||
          `${episode.title} comic episode cover`
      }
    })
  ]);

  const status = await getEpisodeStatus(episode.id);
  revalidateComicRoutes(status.slugs);

  return {
    ...status,
    ok: true,
    status: "episode-published",
    episodePublished: true
  };
}

async function unpublishEpisode(episodeId: string) {
  if (!episodeId) {
    throw new ComicPublishCenterError("missing-episode", "Comic episode is required.");
  }

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
    throw new ComicPublishCenterError("missing-episode", "That comic episode could not be found.");
  }

  await prisma.comicEpisode.update({
    where: { id: episode.id },
    data: {
      published: false,
      publishedAt: null
    }
  });

  const status = await getEpisodeStatus(episode.id);
  revalidateComicRoutes(status.slugs);

  return {
    ...status,
    ok: true,
    status: "episode-unpublished",
    episodePublished: false
  };
}

function extractString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function isPublishCenterIntent(value: string): value is PublishCenterIntent {
  return [
    "approve-asset",
    "unapprove-asset",
    "approve-chinese-asset",
    "unapprove-chinese-asset",
    "publish-episode",
    "unpublish-episode"
  ].includes(value);
}

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized",
        message: "Admin login is required."
      },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-request",
        message: "Request body must be valid JSON."
      },
      { status: 400 }
    );
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const intent = extractString(payload, "intent");

  if (!isPublishCenterIntent(intent)) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-intent",
        message: "Unsupported publish center action."
      },
      { status: 400 }
    );
  }

  try {
    const result =
      intent === "approve-asset"
        ? await approveEnglishAsset(extractString(payload, "assetId"))
        : intent === "unapprove-asset"
          ? await unapproveEnglishAsset(extractString(payload, "assetId"))
          : intent === "approve-chinese-asset"
            ? await approveChineseAsset(extractString(payload, "assetId"))
            : intent === "unapprove-chinese-asset"
              ? await unapproveChineseAsset(extractString(payload, "assetId"))
              : intent === "publish-episode"
                ? await publishEpisode(extractString(payload, "episodeId"))
                : await unpublishEpisode(extractString(payload, "episodeId"));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ComicPublishCenterError) {
      return NextResponse.json(
        {
          ok: false,
          status: error.status,
          message: error.message
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "publish-center-action-failed",
        message: error instanceof Error ? error.message : "Unknown comic publish center error."
      },
      { status: 500 }
    );
  }
}
