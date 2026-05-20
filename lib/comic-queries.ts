import { Prisma } from "@prisma/client";
import type {
  ComicAdminOverviewRecord,
  ComicChapterDetailRecord,
  ComicChapterRecord,
  ComicCharacterRecord,
  ComicEpisodeAssetRecord,
  ComicEpisodeRecord,
  ComicExtraStoryOutlinePageRecord,
  ComicExtraStoryPublishCenterRecord,
  ComicOutlineStudioPageRecord,
  ComicPagePromptRevisionRecord,
  ComicProductLockRecord,
  ComicProductLocksPageRecord,
  ComicPublishCenterEpisodeRecord,
  ComicPublishCenterRecord,
  ComicProjectRecord,
  ComicPromptRunRecord,
  ComicPublicChapterRecord,
  ComicPublicEpisodeRecord,
  ComicPublicSeasonRecord,
  ComicSceneRecord,
  ComicSeasonDetailRecord,
  ComicSeasonRecord
} from "@/lib/types";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { prisma } from "@/lib/db";
import { getDisplayableComicErrorMessage } from "@/lib/comic-action-errors";
import type { ComicLanguage } from "@/lib/comic-language";
import { resolveComicCharacterChineseName } from "@/lib/comic-character-chinese-names";
import {
  COMIC_CHINESE_PAGE_ASSET_TYPE,
  COMIC_EXTRA_PAGE_ASSET_TYPE,
  COMIC_PAGE_ASSET_TYPES,
  COMIC_REQUIRED_PAGE_COUNT,
  COMIC_STORY_PAGES_PER_EPISODE,
  isComicPublishPageNumber
} from "@/lib/comic-pages";

export const COMIC_MAIN_STORY_TYPE = "MAIN";
export const COMIC_EXTRA_STORY_TYPE = "EXTRA";

function isMissingComicTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2021") {
    return false;
  }

  const tableName = typeof error.meta?.table === "string" ? error.meta.table : "";
  const message = error.message || "";
  const comicTablePattern =
    /Comic(Project|Character|Scene|Season|Chapter|Episode|EpisodeAsset|PromptRun|ProductLock)/;

  return comicTablePattern.test(tableName) || comicTablePattern.test(message);
}

async function withComicFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasValidPostgresDatabaseUrl()) {
    return fallback;
  }

  try {
    return await run();
  } catch (error) {
    if (isMissingComicTableError(error)) {
      console.warn("Comic tables are not available yet. Returning a safe empty state instead.");
      return fallback;
    }

    throw error;
  }
}

function mapComicProject(project: any): ComicProjectRecord {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    shortDescription: project.shortDescription,
    storyOutline: project.storyOutline,
    worldRules: project.worldRules,
    visualStyleGuide: project.visualStyleGuide,
    workflowNotes: project.workflowNotes ?? null,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt)
  };
}

function mapComicCharacter(character: any): ComicCharacterRecord {
  return {
    id: character.id,
    name: character.name,
    chineseName: resolveComicCharacterChineseName(character),
    slug: character.slug,
    role: character.role,
    appearance: character.appearance,
    personality: character.personality,
    speechGuide: character.speechGuide,
    referenceFolder: character.referenceFolder,
    referenceNotes: character.referenceNotes ?? null,
    active: character.active,
    sortOrder: character.sortOrder,
    projectId: character.projectId,
    createdAt: new Date(character.createdAt),
    updatedAt: new Date(character.updatedAt)
  };
}

function mapComicScene(scene: any): ComicSceneRecord {
  return {
    id: scene.id,
    name: scene.name,
    slug: scene.slug,
    summary: scene.summary,
    visualNotes: scene.visualNotes,
    moodNotes: scene.moodNotes,
    referenceFolder: scene.referenceFolder,
    referenceNotes: scene.referenceNotes ?? null,
    active: scene.active,
    sortOrder: scene.sortOrder,
    projectId: scene.projectId,
    createdAt: new Date(scene.createdAt),
    updatedAt: new Date(scene.updatedAt)
  };
}

function mapComicSeason(season: any): ComicSeasonRecord {
  return {
    id: season.id,
    seasonNumber: season.seasonNumber,
    slug: season.slug,
    title: season.title,
    summary: season.summary,
    outline: season.outline,
    published: season.published,
    sortOrder: season.sortOrder,
    projectId: season.projectId,
    chapterCount: season._count?.chapters ?? season.chapters?.length ?? 0,
    episodeCount:
      typeof season.episodeCount === "number"
        ? season.episodeCount
        : Array.isArray(season.chapters)
          ? season.chapters.reduce(
              (sum: number, chapter: any) => sum + (chapter.episodes?.length ?? chapter._count?.episodes ?? 0),
              0
            )
          : 0,
    publishedEpisodeCount:
      typeof season.publishedEpisodeCount === "number"
        ? season.publishedEpisodeCount
        : Array.isArray(season.chapters)
          ? season.chapters.reduce(
              (sum: number, chapter: any) =>
                sum +
                (Array.isArray(chapter.episodes)
                  ? chapter.episodes.filter((episode: any) => episode.published).length
                  : 0),
              0
            )
          : 0,
    createdAt: new Date(season.createdAt),
    updatedAt: new Date(season.updatedAt)
  };
}

function mapComicChapter(chapter: any): ComicChapterRecord {
  return {
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    slug: chapter.slug,
    title: chapter.title,
    summary: chapter.summary,
    outline: chapter.outline,
    published: chapter.published,
    sortOrder: chapter.sortOrder,
    seasonId: chapter.seasonId,
    episodeCount:
      typeof chapter.episodeCount === "number"
        ? chapter.episodeCount
        : chapter.episodes?.length ?? chapter._count?.episodes ?? 0,
    publishedEpisodeCount: Array.isArray(chapter.episodes)
      ? chapter.episodes.filter((episode: any) => episode.published).length
      : 0,
    createdAt: new Date(chapter.createdAt),
    updatedAt: new Date(chapter.updatedAt)
  };
}

function mapComicEpisodeAsset(asset: any): ComicEpisodeAssetRecord {
  return {
    id: asset.id,
    assetType: asset.assetType,
    title: asset.title,
    imageUrl: asset.imageUrl,
    altText: asset.altText ?? null,
    caption: asset.caption ?? null,
    sortOrder: asset.sortOrder,
    published: asset.published,
    episodeId: asset.episodeId,
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt)
  };
}

function mapComicPromptRun(run: any): ComicPromptRunRecord {
  return {
    id: run.id,
    promptType: run.promptType,
    model: run.model,
    imageModel: run.imageModel ?? null,
    status: run.status,
    inputContext: run.inputContext,
    outputSummary: run.outputSummary,
    promptPack: run.promptPack ?? null,
    referenceChecklist: run.referenceChecklist ?? null,
    errorMessage: getDisplayableComicErrorMessage(run.errorMessage),
    episodeId: run.episodeId,
    createdAt: new Date(run.createdAt),
    updatedAt: new Date(run.updatedAt)
  };
}

function mapComicEpisode(episode: any): ComicEpisodeRecord {
  return {
    id: episode.id,
    episodeNumber: episode.episodeNumber,
    slug: episode.slug,
    title: episode.title,
    summary: episode.summary,
    outline: episode.outline,
    script: episode.script,
    panelPlan: episode.panelPlan,
    promptPack: episode.promptPack,
    requiredReferences: episode.requiredReferences,
    coverImageUrl: episode.coverImageUrl ?? null,
    coverImageAlt: episode.coverImageAlt ?? null,
    storyType: episode.storyType === COMIC_EXTRA_STORY_TYPE ? COMIC_EXTRA_STORY_TYPE : COMIC_MAIN_STORY_TYPE,
    extraStoryParentEpisodeId: episode.extraStoryParentEpisodeId ?? null,
    extraStoryPlacementOrder: episode.extraStoryPlacementOrder ?? 0,
    published: episode.published,
    publishedAt: episode.publishedAt ? new Date(episode.publishedAt) : null,
    sortOrder: episode.sortOrder,
    chapterId: episode.chapterId,
    assetCount: episode._count?.assets ?? episode.assets?.length ?? 0,
    promptRunCount: episode._count?.promptRuns ?? episode.promptRuns?.length ?? 0,
    latestPromptRunAt:
      Array.isArray(episode.promptRuns) && episode.promptRuns[0]?.createdAt
        ? new Date(episode.promptRuns[0].createdAt)
        : null,
    createdAt: new Date(episode.createdAt),
    updatedAt: new Date(episode.updatedAt)
  };
}

function mapComicProductLock(lock: any): ComicProductLockRecord {
  return {
    id: lock.id,
    productId: lock.productId,
    productName: lock.product?.name || "",
    productSlug: lock.product?.slug || "",
    productStatus: lock.product?.status || "DRAFT",
    productImageUrl: lock.product?.imageUrl || "",
    slug: lock.slug,
    displayName: lock.displayName,
    shortCode: lock.shortCode,
    visualNotes: lock.visualNotes,
    usageNotes: lock.usageNotes,
    referenceNotes: lock.referenceNotes ?? null,
    imageUrl: lock.imageUrl ?? null,
    imageMimeType: lock.imageMimeType ?? null,
    imageStorageKey: lock.imageStorageKey ?? null,
    imageByteSize: lock.imageByteSize ?? null,
    imageSha256: lock.imageSha256 ?? null,
    imagePrompt: lock.imagePrompt ?? null,
    imageGeneratedAt: lock.imageGeneratedAt ? new Date(lock.imageGeneratedAt) : null,
    active: lock.active,
    sortOrder: lock.sortOrder,
    createdAt: new Date(lock.createdAt),
    updatedAt: new Date(lock.updatedAt)
  };
}

function hasComicEpisodeProductionWork(episode: any) {
  const assetCount = episode._count?.assets ?? episode.assets?.length ?? 0;
  const promptRunCount = episode._count?.promptRuns ?? episode.promptRuns?.length ?? 0;

  return assetCount > 0 || promptRunCount > 0 || Boolean((episode.promptPack || "").trim());
}

function getComicEpisodeWorkSortTime(episode: any) {
  const latestPromptRunAt = Array.isArray(episode.promptRuns)
    ? episode.promptRuns[0]?.createdAt
    : null;

  return latestPromptRunAt
    ? new Date(latestPromptRunAt).getTime()
    : new Date(episode.updatedAt).getTime();
}

function mapComicOverviewEpisode(
  episode: any,
  options: { overviewWorkLabel?: string } = {}
) {
  return {
    ...mapComicEpisode(episode),
    seasonTitle: episode.chapter.season.title,
    seasonSlug: episode.chapter.season.slug,
    chapterTitle: episode.chapter.title,
    chapterSlug: episode.chapter.slug,
    overviewWorkLabel: options.overviewWorkLabel
  };
}

function getComicOverviewEpisodeQueue(episodes: any[]) {
  const orderedEpisodes = [...episodes].sort((left, right) => {
    if (left.episodeNumber !== right.episodeNumber) {
      return left.episodeNumber - right.episodeNumber;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
  const recentWorkedEpisodes = orderedEpisodes
    .filter(hasComicEpisodeProductionWork)
    .sort((left, right) => getComicEpisodeWorkSortTime(right) - getComicEpisodeWorkSortTime(left))
    .slice(0, 6);
  const lastWorkedIndex = orderedEpisodes.reduce(
    (latestIndex, episode, index) =>
      hasComicEpisodeProductionWork(episode) ? index : latestIndex,
    -1
  );
  const nextUntouchedEpisode =
    orderedEpisodes
      .slice(lastWorkedIndex >= 0 ? lastWorkedIndex + 1 : 0)
      .find((episode) => !hasComicEpisodeProductionWork(episode)) || null;
  const queueById = new Map<string, ReturnType<typeof mapComicOverviewEpisode>>();

  recentWorkedEpisodes.forEach((episode) => {
    queueById.set(episode.id, mapComicOverviewEpisode(episode));
  });

  if (nextUntouchedEpisode && !queueById.has(nextUntouchedEpisode.id)) {
    queueById.set(
      nextUntouchedEpisode.id,
      mapComicOverviewEpisode(nextUntouchedEpisode, {
        overviewWorkLabel: "Next untouched"
      })
    );
  }

  return Array.from(queueById.values());
}

async function getComicProjectInternal() {
  return prisma.comicProject.findFirst({
    orderBy: [{ createdAt: "asc" }]
  });
}

export async function getComicAdminOverview() {
  return withComicFallback<ComicAdminOverviewRecord>(
    async () => {
      const [
        project,
        characterCount,
        sceneCount,
        seasonCount,
        chapterCount,
        episodeCount,
        publishedEpisodeCount,
        overviewSeasons
      ] = await Promise.all([
        getComicProjectInternal(),
        prisma.comicCharacter.count(),
        prisma.comicScene.count(),
        prisma.comicSeason.count(),
        prisma.comicChapter.count(),
        prisma.comicEpisode.count({ where: { storyType: COMIC_MAIN_STORY_TYPE } }),
        prisma.comicEpisode.count({
          where: { storyType: COMIC_MAIN_STORY_TYPE, published: true }
        }),
        prisma.comicSeason.findMany({
          include: {
            chapters: {
              include: {
                episodes: {
                  where: {
                    storyType: COMIC_MAIN_STORY_TYPE
                  },
                  include: {
                    chapter: {
                      include: {
                        season: true
                      }
                    },
                    _count: {
                      select: {
                        assets: true,
                        promptRuns: true
                      }
                    },
                    promptRuns: {
                      orderBy: [{ createdAt: "desc" }],
                      take: 1
                    }
                  },
                  orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
                }
              },
              orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
            }
          },
          orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
        })
      ]);
      const overviewEpisodes = overviewSeasons.flatMap((season) =>
        season.chapters.flatMap((chapter) => chapter.episodes)
      );

      return {
        project: project ? mapComicProject(project) : null,
        characterCount,
        sceneCount,
        seasonCount,
        chapterCount,
        episodeCount,
        publishedEpisodeCount,
        recentEpisodes: getComicOverviewEpisodeQueue(overviewEpisodes)
      };
    },
    {
      project: null,
      characterCount: 0,
      sceneCount: 0,
      seasonCount: 0,
      chapterCount: 0,
      episodeCount: 0,
      publishedEpisodeCount: 0,
      recentEpisodes: []
    }
  );
}

export async function getComicProject() {
  return withComicFallback<ComicProjectRecord | null>(
    async () => {
      const project = await getComicProjectInternal();
      return project ? mapComicProject(project) : null;
    },
    null
  );
}

export async function getComicCharacters() {
  return withComicFallback<ComicCharacterRecord[]>(
    async () => {
      const characters = await prisma.comicCharacter.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return characters.map(mapComicCharacter);
    },
    []
  );
}

export async function getComicCharacterById(id: string) {
  return withComicFallback<ComicCharacterRecord | null>(
    async () => {
      const character = await prisma.comicCharacter.findUnique({ where: { id } });
      return character ? mapComicCharacter(character) : null;
    },
    null
  );
}

export async function getComicScenes() {
  return withComicFallback<ComicSceneRecord[]>(
    async () => {
      const scenes = await prisma.comicScene.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return scenes.map(mapComicScene);
    },
    []
  );
}

export async function getComicSceneById(id: string) {
  return withComicFallback<ComicSceneRecord | null>(
    async () => {
      const scene = await prisma.comicScene.findUnique({ where: { id } });
      return scene ? mapComicScene(scene) : null;
    },
    null
  );
}

export async function getComicSeasonsForAdmin() {
  return withComicFallback<ComicSeasonRecord[]>(
    async () => {
      const seasons = await prisma.comicSeason.findMany({
        include: {
          chapters: {
            include: {
              episodes: {
                where: {
                  storyType: COMIC_MAIN_STORY_TYPE
                },
                select: {
                  id: true,
                  published: true
                }
              }
            }
          },
          _count: {
            select: {
              chapters: true
            }
          }
        },
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return seasons.map(mapComicSeason);
    },
    []
  );
}

export async function getComicSeasonById(id: string) {
  return withComicFallback<ComicSeasonDetailRecord | null>(
    async () => {
      const season = await prisma.comicSeason.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              chapters: true
            }
          },
          chapters: {
            include: {
              _count: {
                select: {
                  episodes: true
                }
              },
              episodes: {
                where: {
                  storyType: COMIC_MAIN_STORY_TYPE
                },
                select: {
                  id: true,
                  published: true
                }
              }
            },
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!season) {
        return null;
      }

      return {
        season: mapComicSeason(season),
        chapters: season.chapters.map(mapComicChapter)
      };
    },
    null
  );
}

export async function getComicChapterById(id: string) {
  return withComicFallback<ComicChapterDetailRecord | null>(
    async () => {
      const chapter = await prisma.comicChapter.findUnique({
        where: { id },
        include: {
          season: {
            include: {
              _count: {
                select: {
                  chapters: true
                }
              }
            }
          },
          _count: {
            select: {
              episodes: true
            }
          },
          episodes: {
            where: {
              storyType: COMIC_MAIN_STORY_TYPE
            },
            include: {
              _count: {
                select: {
                  assets: true,
                  promptRuns: true
                }
              },
              promptRuns: {
                orderBy: [{ createdAt: "desc" }],
                take: 1
              }
            },
            orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!chapter) {
        return null;
      }

      return {
        season: mapComicSeason(chapter.season),
        chapter: mapComicChapter(chapter),
        episodes: chapter.episodes.map(mapComicEpisode)
      };
    },
    null
  );
}

export async function getComicOutlineStudioPage() {
  return withComicFallback<ComicOutlineStudioPageRecord>(
    async () => {
      const [project, characters, scenes, seasons] = await Promise.all([
        getComicProjectInternal(),
        prisma.comicCharacter.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.comicScene.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.comicSeason.findMany({
          include: {
            chapters: {
              include: {
                episodes: {
                  where: {
                    storyType: COMIC_MAIN_STORY_TYPE
                  },
                  include: {
                    _count: {
                      select: {
                        assets: true,
                        promptRuns: true
                      }
                    },
                    promptRuns: {
                      orderBy: [{ createdAt: "desc" }],
                      take: 1
                    }
                  },
                  orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
                },
                _count: {
                  select: {
                    episodes: true
                  }
                }
              },
              orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
            },
            _count: {
              select: {
                chapters: true
              }
            }
          },
          orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
        })
      ]);

      return {
        project: project ? mapComicProject(project) : null,
        characters: characters.map(mapComicCharacter),
        scenes: scenes.map(mapComicScene),
        seasons: seasons.map((season) => ({
          ...mapComicSeason(season),
          chapters: season.chapters.map((chapter) => ({
            ...mapComicChapter(chapter),
            episodes: chapter.episodes.map(mapComicEpisode)
          }))
        }))
      };
    },
    {
      project: null,
      characters: [],
      scenes: [],
      seasons: []
    }
  );
}

const COMIC_PUBLIC_PAGE_ASSET_TYPES = [
  ...COMIC_PAGE_ASSET_TYPES,
  COMIC_CHINESE_PAGE_ASSET_TYPE,
  COMIC_EXTRA_PAGE_ASSET_TYPE
];

type ComicPageApprovalCandidate = Pick<
  ComicEpisodeAssetRecord,
  "assetType" | "published" | "sortOrder"
>;

function isComicPageAsset(asset: ComicPageApprovalCandidate) {
  return COMIC_PAGE_ASSET_TYPES.includes(asset.assetType);
}

function isChineseComicPageAsset(asset: ComicPageApprovalCandidate) {
  return asset.assetType === COMIC_CHINESE_PAGE_ASSET_TYPE;
}

function isComicExtraPageAsset(asset: ComicPageApprovalCandidate) {
  return asset.assetType === COMIC_EXTRA_PAGE_ASSET_TYPE;
}

function isRequiredComicPageNumber(pageNumber: number) {
  return isComicPublishPageNumber(pageNumber);
}

function getApprovedRequiredPageCountByPredicate(
  assets: ComicPageApprovalCandidate[],
  isMatchingAsset: (asset: ComicPageApprovalCandidate) => boolean
) {
  return new Set(
    assets
      .filter(
        (asset) =>
          isMatchingAsset(asset) &&
          asset.published &&
          isRequiredComicPageNumber(asset.sortOrder)
      )
      .map((asset) => asset.sortOrder)
  ).size;
}

function getApprovedRequiredPageCount(assets: ComicPageApprovalCandidate[]) {
  return getApprovedRequiredPageCountByPredicate(assets, isComicPageAsset);
}

function getApprovedRequiredChinesePageCount(assets: ComicPageApprovalCandidate[]) {
  return getApprovedRequiredPageCountByPredicate(assets, isChineseComicPageAsset);
}

function hasAllRequiredComicPagesForLanguage(
  assets: ComicPageApprovalCandidate[],
  language: ComicLanguage
) {
  if (language === "zh") {
    return getApprovedRequiredChinesePageCount(assets) === COMIC_REQUIRED_PAGE_COUNT;
  }

  return getApprovedRequiredPageCount(assets) === COMIC_REQUIRED_PAGE_COUNT;
}

function getPublicComicAssetsForLanguage(
  assets: ComicEpisodeAssetRecord[],
  language: ComicLanguage
) {
  const matchingRequiredAssets = assets
    .filter(
      (asset) =>
        (language === "zh" ? isChineseComicPageAsset(asset) : isComicPageAsset(asset)) &&
        asset.published &&
        isRequiredComicPageNumber(asset.sortOrder)
    )
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

  const assetByPage = new Map<number, ComicEpisodeAssetRecord>();

  matchingRequiredAssets.forEach((asset) => {
    if (!assetByPage.has(asset.sortOrder)) {
      assetByPage.set(asset.sortOrder, asset);
    }
  });

  const extraAssets =
    language === "en"
      ? assets.filter(
          (asset) =>
            isComicExtraPageAsset(asset) &&
            asset.published &&
            isRequiredComicPageNumber(asset.sortOrder)
        )
      : [];

  return [...Array.from(assetByPage.values()), ...extraAssets].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (isComicExtraPageAsset(left) !== isComicExtraPageAsset(right)) {
      return isComicExtraPageAsset(left) ? 1 : -1;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

function compareComicEpisodesByMainOrder(left: any, right: any) {
  if (left.episodeNumber !== right.episodeNumber) {
    return left.episodeNumber - right.episodeNumber;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function compareComicExtraStories(left: any, right: any) {
  if (left.extraStoryPlacementOrder !== right.extraStoryPlacementOrder) {
    return left.extraStoryPlacementOrder - right.extraStoryPlacementOrder;
  }

  if (left.episodeNumber !== right.episodeNumber) {
    return left.episodeNumber - right.episodeNumber;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function orderPublicComicEpisodes(episodes: any[], language: ComicLanguage) {
  const visibleEpisodes = episodes.filter((episode) =>
    hasAllRequiredComicPagesForLanguage(episode.assets || [], language)
  );
  const mainEpisodes = visibleEpisodes
    .filter((episode) => episode.storyType !== COMIC_EXTRA_STORY_TYPE)
    .sort(compareComicEpisodesByMainOrder);
  const extraStoriesByParentId = new Map<string, any[]>();

  visibleEpisodes
    .filter((episode) => episode.storyType === COMIC_EXTRA_STORY_TYPE && episode.extraStoryParentEpisodeId)
    .forEach((episode) => {
      const parentId = episode.extraStoryParentEpisodeId;
      const existing = extraStoriesByParentId.get(parentId) || [];
      existing.push(episode);
      extraStoriesByParentId.set(parentId, existing);
    });

  return mainEpisodes.flatMap((episode) => [
    episode,
    ...(extraStoriesByParentId.get(episode.id) || []).sort(compareComicExtraStories)
  ]);
}

function mapComicEpisodePlacementOption(episode: any) {
  return {
    ...mapComicEpisode(episode),
    seasonTitle: episode.chapter?.season?.title || "",
    seasonSlug: episode.chapter?.season?.slug || "",
    chapterTitle: episode.chapter?.title || "",
    chapterSlug: episode.chapter?.slug || ""
  };
}

async function getMainComicEpisodePlacementOptions() {
  const episodes = await prisma.comicEpisode.findMany({
    where: {
      storyType: COMIC_MAIN_STORY_TYPE
    },
    include: {
      chapter: {
        include: {
          season: true
        }
      }
    },
    orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return episodes.map(mapComicEpisodePlacementOption);
}

export async function getComicPublishCenter() {
  return withComicFallback<ComicPublishCenterRecord>(
    async () => {
      const seasons = await prisma.comicSeason.findMany({
        include: {
          _count: {
            select: {
              chapters: true
            }
          },
          chapters: {
            include: {
              _count: {
                select: {
                  episodes: true
                }
              },
              episodes: {
                where: {
                  storyType: COMIC_MAIN_STORY_TYPE
                },
                include: {
                  _count: {
                    select: {
                      assets: true,
                      promptRuns: true
                    }
                  },
                  promptRuns: {
                    where: {
                      promptType: {
                        in: [
                          "PAGE_IMAGE_GENERATION",
                          "PAGE_IMAGE_EDIT"
                        ]
                      }
                    },
                    orderBy: [{ createdAt: "desc" }],
                    take: 1
                  },
                  assets: {
                    select: {
                      assetType: true,
                      sortOrder: true,
                      published: true
                    }
                  }
                },
                orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
              }
            },
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });

      let episodeCount = 0;
      let readyEpisodeCount = 0;
      let publishedEpisodeCount = 0;
      let draftAssetCount = 0;

      const mappedSeasons = seasons.map((season) => ({
        ...mapComicSeason(season),
        chapters: season.chapters.map((chapter) => ({
          ...mapComicChapter(chapter),
          seasonTitle: season.title,
          seasonSlug: season.slug,
          episodes: chapter.episodes.map((episode) => {
            episodeCount += 1;
            if (episode.published) {
              publishedEpisodeCount += 1;
            }

            const pageAssets = episode.assets.filter(isComicPageAsset);
            const chinesePageAssets = episode.assets.filter(isChineseComicPageAsset);
            const draftPages = pageAssets.filter((asset) => !asset.published);
            const approvedPageCount = getApprovedRequiredPageCount(pageAssets);
            const approvedChinesePageCount = getApprovedRequiredChinesePageCount(chinesePageAssets);
            const draftPageCount = draftPages.length;
            const canPublish = approvedPageCount === COMIC_REQUIRED_PAGE_COUNT;
            const canPublishChinese = approvedChinesePageCount === COMIC_REQUIRED_PAGE_COUNT;
            const promptRuns = episode.promptRuns.map(mapComicPromptRun);
            const latestImageGenerationRun =
              promptRuns.find((run) =>
                ["PAGE_IMAGE_GENERATION", "PAGE_IMAGE_EDIT"].includes(run.promptType)
              ) || null;

            if (canPublish && !episode.published) {
              readyEpisodeCount += 1;
            }
            draftAssetCount += draftPageCount;

            return {
              ...mapComicEpisode(episode),
              seasonTitle: season.title,
              seasonSlug: season.slug,
              chapterTitle: chapter.title,
              chapterSlug: chapter.slug,
              approvedPageCount,
              approvedChinesePageCount,
              draftPageCount,
              requiredPageCount: COMIC_REQUIRED_PAGE_COUNT,
              canPublish,
              canPublishChinese,
              latestImageGenerationAt: latestImageGenerationRun?.createdAt
                ? new Date(latestImageGenerationRun.createdAt)
                : null,
              latestImageGenerationStatus: latestImageGenerationRun?.status ?? null,
              latestImageGenerationSummary: latestImageGenerationRun?.outputSummary ?? null,
              latestImageGenerationError: latestImageGenerationRun?.errorMessage ?? null,
              promptRevisionHistory: [],
              assets: []
            };
          })
        }))
      }));

      return {
        seasons: mappedSeasons,
        episodeCount,
        readyEpisodeCount,
        publishedEpisodeCount,
        draftAssetCount
      };
    },
    {
      seasons: [],
      episodeCount: 0,
      readyEpisodeCount: 0,
      publishedEpisodeCount: 0,
      draftAssetCount: 0
    }
  );
}

export async function getComicExtraStoryOutlinePage() {
  return withComicFallback<ComicExtraStoryOutlinePageRecord>(
    async () => {
      const [parentEpisodes, extraStories] = await Promise.all([
        getMainComicEpisodePlacementOptions(),
        prisma.comicEpisode.findMany({
          where: {
            storyType: COMIC_EXTRA_STORY_TYPE
          },
          include: {
            extraStoryParentEpisode: {
              select: {
                id: true,
                episodeNumber: true,
                title: true
              }
            },
            chapter: {
              include: {
                season: true
              }
            },
            _count: {
              select: {
                assets: true,
                promptRuns: true
              }
            },
            promptRuns: {
              orderBy: [{ createdAt: "desc" }],
              take: 1
            }
          },
          orderBy: [
            { extraStoryPlacementOrder: "asc" },
            { episodeNumber: "asc" },
            { createdAt: "asc" }
          ]
        })
      ]);

      return {
        parentEpisodes,
        extraStories: extraStories
          .map((episode) => ({
            ...mapComicEpisodePlacementOption(episode),
            parentEpisodeTitle: episode.extraStoryParentEpisode?.title ?? null,
            parentEpisodeNumber: episode.extraStoryParentEpisode?.episodeNumber ?? null
          }))
          .sort((left, right) => {
            const leftParent = left.parentEpisodeNumber ?? Number.MAX_SAFE_INTEGER;
            const rightParent = right.parentEpisodeNumber ?? Number.MAX_SAFE_INTEGER;

            if (leftParent !== rightParent) {
              return leftParent - rightParent;
            }

            if (left.extraStoryPlacementOrder !== right.extraStoryPlacementOrder) {
              return left.extraStoryPlacementOrder - right.extraStoryPlacementOrder;
            }

            return left.createdAt.getTime() - right.createdAt.getTime();
          })
      };
    },
    {
      parentEpisodes: [],
      extraStories: []
    }
  );
}

export async function getComicExtraStoryPublishCenter() {
  return withComicFallback<ComicExtraStoryPublishCenterRecord>(
    async () => {
      const [parentEpisodes, extraStories] = await Promise.all([
        getMainComicEpisodePlacementOptions(),
        prisma.comicEpisode.findMany({
          where: {
            storyType: COMIC_EXTRA_STORY_TYPE
          },
          include: {
            extraStoryParentEpisode: {
              select: {
                id: true,
                episodeNumber: true,
                title: true
              }
            },
            chapter: {
              include: {
                season: true
              }
            },
            _count: {
              select: {
                assets: true,
                promptRuns: true
              }
            },
            promptRuns: {
              where: {
                promptType: {
                  in: ["PAGE_IMAGE_GENERATION", "PAGE_IMAGE_EDIT"]
                }
              },
              orderBy: [{ createdAt: "desc" }],
              take: 1
            },
            assets: {
              select: {
                assetType: true,
                sortOrder: true,
                published: true
              }
            }
          },
          orderBy: [
            { episodeNumber: "asc" },
            { createdAt: "asc" }
          ]
        })
      ]);

      let readyEpisodeCount = 0;
      let publishedEpisodeCount = 0;
      let draftAssetCount = 0;

      const mappedExtraStories = extraStories
        .map((episode) => {
          if (episode.published) {
            publishedEpisodeCount += 1;
          }

          const pageAssets = episode.assets.filter(isComicPageAsset);
          const chinesePageAssets = episode.assets.filter(isChineseComicPageAsset);
          const draftPages = pageAssets.filter((asset) => !asset.published);
          const approvedPageCount = getApprovedRequiredPageCount(pageAssets);
          const approvedChinesePageCount = getApprovedRequiredChinesePageCount(chinesePageAssets);
          const draftPageCount = draftPages.length;
          const canPublish = approvedPageCount === COMIC_REQUIRED_PAGE_COUNT;
          const canPublishChinese = approvedChinesePageCount === COMIC_REQUIRED_PAGE_COUNT;
          const promptRuns = episode.promptRuns.map(mapComicPromptRun);
          const latestImageGenerationRun =
            promptRuns.find((run) =>
              ["PAGE_IMAGE_GENERATION", "PAGE_IMAGE_EDIT"].includes(run.promptType)
            ) || null;

          if (canPublish && !episode.published) {
            readyEpisodeCount += 1;
          }

          draftAssetCount += draftPageCount;

          return {
            ...mapComicEpisodePlacementOption(episode),
            parentEpisodeTitle: episode.extraStoryParentEpisode?.title ?? null,
            parentEpisodeNumber: episode.extraStoryParentEpisode?.episodeNumber ?? null,
            approvedPageCount,
            approvedChinesePageCount,
            draftPageCount,
            requiredPageCount: COMIC_REQUIRED_PAGE_COUNT,
            canPublish,
            canPublishChinese,
            latestImageGenerationAt: latestImageGenerationRun?.createdAt
              ? new Date(latestImageGenerationRun.createdAt)
              : null,
            latestImageGenerationStatus: latestImageGenerationRun?.status ?? null,
            latestImageGenerationSummary: latestImageGenerationRun?.outputSummary ?? null,
            latestImageGenerationError: latestImageGenerationRun?.errorMessage ?? null,
            promptRevisionHistory: [],
            assets: []
          };
        })
        .sort((left, right) => {
          if (left.episodeNumber !== right.episodeNumber) {
            return left.episodeNumber - right.episodeNumber;
          }

          return left.createdAt.getTime() - right.createdAt.getTime();
        });

      return {
        parentEpisodes,
        extraStories: mappedExtraStories,
        episodeCount: mappedExtraStories.length,
        readyEpisodeCount,
        publishedEpisodeCount,
        draftAssetCount
      };
    },
    {
      parentEpisodes: [],
      extraStories: [],
      episodeCount: 0,
      readyEpisodeCount: 0,
      publishedEpisodeCount: 0,
      draftAssetCount: 0
    }
  );
}

export async function getComicProductLocksPage() {
  return withComicFallback<ComicProductLocksPageRecord>(
    async () => {
      const [locks, activeProducts] = await Promise.all([
        prisma.comicProductLock.findMany({
          select: {
            id: true,
            productId: true,
            slug: true,
            displayName: true,
            shortCode: true,
            visualNotes: true,
            usageNotes: true,
            referenceNotes: true,
            imageUrl: true,
            imageMimeType: true,
            imageStorageKey: true,
            imageByteSize: true,
            imageSha256: true,
            imagePrompt: true,
            imageGeneratedAt: true,
            active: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                name: true,
                slug: true,
                status: true,
                imageUrl: true
              }
            }
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.product.findMany({
          where: {
            status: "ACTIVE"
          },
          select: {
            id: true,
            productCode: true,
            productShortName: true,
            name: true,
            slug: true,
            status: true,
            imageUrl: true
          },
          orderBy: [{ featured: "desc" }, { createdAt: "asc" }]
        })
      ]);

      return {
        locks: locks.map(mapComicProductLock),
        activeProducts
      };
    },
    {
      locks: [],
      activeProducts: []
    }
  );
}

export async function getComicPublishEpisodeDetail(episodeId: string) {
  return withComicFallback<ComicPublishCenterEpisodeRecord | null>(
    async () => {
      const episode = await prisma.comicEpisode.findUnique({
        where: { id: episodeId },
        include: {
          chapter: {
            include: {
              season: true
            }
          },
          _count: {
            select: {
              assets: true,
              promptRuns: true
            }
          },
          promptRuns: {
            where: {
              promptType: {
                in: [
                  "PAGE_IMAGE_GENERATION",
                  "PAGE_IMAGE_EDIT",
                  "PAGE_PROMPT_REVISION",
                  "PAGE_CHINESE_VERSION"
                ]
              }
            },
            orderBy: [{ createdAt: "desc" }],
            take: 200
          },
          assets: {
            select: {
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
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!episode) {
        return null;
      }

      const assets = episode.assets.map(mapComicEpisodeAsset);
      const pageAssets = assets.filter(isComicPageAsset);
      const chinesePageAssets = assets.filter(isChineseComicPageAsset);
      const approvedPageCount = getApprovedRequiredPageCount(pageAssets);
      const approvedChinesePageCount = getApprovedRequiredChinesePageCount(chinesePageAssets);
      const promptRuns = episode.promptRuns.map(mapComicPromptRun);
      const latestImageGenerationRun =
        promptRuns.find((run) =>
          ["PAGE_IMAGE_GENERATION", "PAGE_IMAGE_EDIT"].includes(run.promptType)
        ) || null;

      return {
        ...mapComicEpisode(episode),
        seasonTitle: episode.chapter.season.title,
        seasonSlug: episode.chapter.season.slug,
        chapterTitle: episode.chapter.title,
        chapterSlug: episode.chapter.slug,
        approvedPageCount,
        approvedChinesePageCount,
        draftPageCount: pageAssets.filter((asset) => !asset.published).length,
        requiredPageCount: COMIC_REQUIRED_PAGE_COUNT,
        canPublish: approvedPageCount === COMIC_REQUIRED_PAGE_COUNT,
        canPublishChinese: approvedChinesePageCount === COMIC_REQUIRED_PAGE_COUNT,
        latestImageGenerationAt: latestImageGenerationRun?.createdAt
          ? new Date(latestImageGenerationRun.createdAt)
          : null,
        latestImageGenerationStatus: latestImageGenerationRun?.status ?? null,
        latestImageGenerationSummary: latestImageGenerationRun?.outputSummary ?? null,
        latestImageGenerationError: latestImageGenerationRun?.errorMessage ?? null,
        promptRevisionHistory: getLatestComicPagePromptRevisionHistory(promptRuns),
        assets
      };
    },
    null
  );
}

export async function getPublishedComicLibrary(language: ComicLanguage = "en") {
  return withComicFallback<ComicPublicSeasonRecord[]>(
    async () => {
      const seasons = await prisma.comicSeason.findMany({
        where: {
          published: true,
          chapters: {
            some: {
              published: true,
              episodes: {
                some: {
                  published: true,
                  assets: {
                    some: {
                      published: true,
                      assetType: { in: COMIC_PAGE_ASSET_TYPES },
                      sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
                    }
                  }
                }
              }
            }
          }
        },
        include: {
          chapters: {
            where: {
              published: true,
              episodes: {
                some: {
                  published: true,
                  assets: {
                    some: {
                      published: true,
                      assetType: { in: COMIC_PAGE_ASSET_TYPES },
                      sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
                    }
                  }
                }
              }
            },
            include: {
              episodes: {
                where: {
                  published: true,
                  assets: {
                    some: {
                      published: true,
                      assetType: { in: COMIC_PAGE_ASSET_TYPES },
                      sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
                    }
                  }
                },
                include: {
                  assets: {
                    where: {
                      published: true,
                      assetType: { in: COMIC_PUBLIC_PAGE_ASSET_TYPES },
                      sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
                    },
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
                  }
                },
                orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
              }
            },
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });

      return seasons
        .map((season) => {
          const chapters = season.chapters
            .map((chapter): ComicPublicChapterRecord => {
              const episodes = orderPublicComicEpisodes(chapter.episodes, language)
                .map((episode): ComicPublicEpisodeRecord => ({
                  ...mapComicEpisode(episode),
                  assets: getPublicComicAssetsForLanguage(
                    episode.assets.map(mapComicEpisodeAsset),
                    language
                  ),
                  seasonTitle: season.title,
                  seasonSlug: season.slug,
                  chapterTitle: chapter.title,
                  chapterSlug: chapter.slug
                }));

              return {
                ...mapComicChapter(chapter),
                seasonTitle: season.title,
                seasonSlug: season.slug,
                episodes
              };
            })
            .filter((chapter) => chapter.episodes.length > 0);

          return {
            ...mapComicSeason(season),
            chapters
          };
        })
        .filter((season) => season.chapters.length > 0);
    },
    []
  );
}

export async function getPublishedComicEpisodePageBySlugs(
  seasonSlug: string,
  chapterSlug: string,
  episodeSlug: string,
  language: ComicLanguage = "en"
) {
  return withComicFallback<{
    episode: ComicPublicEpisodeRecord | null;
    previousEpisode: ComicPublicEpisodeRecord | null;
    nextEpisode: ComicPublicEpisodeRecord | null;
    availableLanguages: Record<ComicLanguage, boolean>;
  }>(
    async () => {
      const currentEpisode = await prisma.comicEpisode.findFirst({
        where: {
          slug: episodeSlug,
          published: true,
          chapter: {
            slug: chapterSlug,
            published: true,
            season: {
              slug: seasonSlug,
              published: true
            }
          }
        },
        include: {
          chapter: {
            include: {
              season: true
            }
          },
          assets: {
            where: {
              published: true,
              assetType: { in: COMIC_PUBLIC_PAGE_ASSET_TYPES },
              sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!currentEpisode) {
        return {
          episode: null,
          previousEpisode: null,
          nextEpisode: null,
          availableLanguages: { en: false, zh: false }
        };
      }

      const currentAssets = currentEpisode.assets.map(mapComicEpisodeAsset);
      const availableLanguages = {
        en: hasAllRequiredComicPagesForLanguage(currentAssets, "en"),
        zh: hasAllRequiredComicPagesForLanguage(currentAssets, "zh")
      };

      if (!availableLanguages[language]) {
        return {
          episode: null,
          previousEpisode: null,
          nextEpisode: null,
          availableLanguages
        };
      }

      const navEpisodes = await prisma.comicEpisode.findMany({
        where: {
          published: true,
          chapter: {
            published: true,
            season: {
              published: true
            }
          },
          assets: {
            some: {
              published: true,
              assetType: { in: COMIC_PUBLIC_PAGE_ASSET_TYPES },
              sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
            }
          }
        },
        include: {
          chapter: {
            include: {
              season: true
            }
          },
          assets: {
            where: {
              published: true,
              assetType: { in: COMIC_PUBLIC_PAGE_ASSET_TYPES },
              sortOrder: { gte: 0, lte: COMIC_STORY_PAGES_PER_EPISODE }
            },
            select: {
              assetType: true,
              published: true,
              sortOrder: true
            }
          }
        },
        orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });
      const navRecords = orderPublicComicEpisodes(navEpisodes, language)
        .map((episode): ComicPublicEpisodeRecord => ({
          ...mapComicEpisode(episode),
          assets: [],
          seasonTitle: episode.chapter.season.title,
          seasonSlug: episode.chapter.season.slug,
          chapterTitle: episode.chapter.title,
          chapterSlug: episode.chapter.slug
        }));
      const currentIndex = navRecords.findIndex((episode) => episode.id === currentEpisode.id);

      return {
        episode: {
          ...mapComicEpisode(currentEpisode),
          assets: getPublicComicAssetsForLanguage(currentAssets, language),
          seasonTitle: currentEpisode.chapter.season.title,
          seasonSlug: currentEpisode.chapter.season.slug,
          chapterTitle: currentEpisode.chapter.title,
          chapterSlug: currentEpisode.chapter.slug
        },
        previousEpisode: currentIndex > 0 ? navRecords[currentIndex - 1] : null,
        nextEpisode:
          currentIndex >= 0 && currentIndex < navRecords.length - 1
            ? navRecords[currentIndex + 1]
            : null,
        availableLanguages
      };
    },
    {
      episode: null,
      previousEpisode: null,
      nextEpisode: null,
      availableLanguages: { en: false, zh: false }
    }
  );
}

export async function getPublishedComicSeasonBySlug(
  seasonSlug: string,
  language: ComicLanguage = "en"
) {
  const seasons = await getPublishedComicLibrary(language);
  return seasons.find((season) => season.slug === seasonSlug) ?? null;
}

function safeParseComicPromptRunContext(value: string) {
  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapComicPagePromptRevisionRun(run: ComicPromptRunRecord): ComicPagePromptRevisionRecord | null {
  if (run.promptType !== "PAGE_PROMPT_REVISION") {
    return null;
  }

  const context = safeParseComicPromptRunContext(run.inputContext);
  const pageNumber = Number(context?.pageNumber);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return null;
  }

  const currentPage =
    context?.currentPage && typeof context.currentPage === "object" && !Array.isArray(context.currentPage)
      ? (context.currentPage as Record<string, unknown>)
      : null;

  return {
    id: run.id,
    pageNumber,
    status: run.status,
    promptSuggestion: toNullableString(context?.promptSuggestion),
    previousPromptPack: toNullableString(currentPage?.promptPackCopyText),
    previousReferenceChecklist: toNullableString(currentPage?.referenceNotesCopyText),
    revisedPromptPack: run.status === "READY" ? run.promptPack : null,
    revisedReferenceChecklist: run.status === "READY" ? run.referenceChecklist : null,
    outputSummary: run.outputSummary,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt
  };
}

function getLatestComicPagePromptRevisionHistory(promptRuns: ComicPromptRunRecord[]) {
  const revisions: ComicPagePromptRevisionRecord[] = [];
  const countByPage = new Map<number, number>();

  for (const run of promptRuns) {
    const revision = mapComicPagePromptRevisionRun(run);

    if (!revision) {
      continue;
    }

    const currentCount = countByPage.get(revision.pageNumber) || 0;

    if (currentCount >= 3) {
      continue;
    }

    revisions.push(revision);
    countByPage.set(revision.pageNumber, currentCount + 1);
  }

  return revisions;
}

export async function getPublishedComicChapterBySlugs(
  seasonSlug: string,
  chapterSlug: string,
  language: ComicLanguage = "en"
) {
  const season = await getPublishedComicSeasonBySlug(seasonSlug, language);
  if (!season) {
    return null;
  }

  return season.chapters.find((chapter) => chapter.slug === chapterSlug) ?? null;
}

export async function getPublishedComicEpisodeBySlugs(
  seasonSlug: string,
  chapterSlug: string,
  episodeSlug: string,
  language: ComicLanguage = "en"
) {
  const chapter = await getPublishedComicChapterBySlugs(seasonSlug, chapterSlug, language);
  if (!chapter) {
    return null;
  }

  return chapter.episodes.find((episode) => episode.slug === episodeSlug) ?? null;
}
