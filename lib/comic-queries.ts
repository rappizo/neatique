import { Prisma } from "@prisma/client";
import type {
  ComicAdminOverviewRecord,
  ComicChapterDetailRecord,
  ComicChapterSceneReferenceRecord,
  ComicChapterRecord,
  ComicCharacterRecord,
  ComicEpisodeAssetRecord,
  ComicEpisodeDetailRecord,
  ComicEpisodeRecord,
  ComicPublishCenterRecord,
  ComicProjectRecord,
  ComicPromptRunRecord,
  ComicPromptStudioPageRecord,
  ComicPublicChapterRecord,
  ComicPublicEpisodeRecord,
  ComicPublicSeasonRecord,
  ComicSceneRecord,
  ComicSeasonDetailRecord,
  ComicSeasonRecord
} from "@/lib/types";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { prisma } from "@/lib/db";
import { getComicChapterSceneReferenceState } from "@/lib/comic-reference-manifest";

function isMissingComicTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2021") {
    return false;
  }

  const tableName = typeof error.meta?.table === "string" ? error.meta.table : "";
  const message = error.message || "";
  const comicTablePattern =
    /Comic(Project|Character|Scene|Season|Chapter|Episode|EpisodeAsset|PromptRun)/;

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

async function loadComicChapterSceneReferenceState(
  seasonSlug: string,
  chapterSlug: string
): Promise<{
  chapterSceneReferenceFolder: string;
  chapterSceneReferences: ComicChapterSceneReferenceRecord[];
}> {
  return getComicChapterSceneReferenceState(seasonSlug, chapterSlug);
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
              (sum: number, chapter: any) => sum + (chapter._count?.episodes ?? chapter.episodes?.length ?? 0),
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
    episodeCount: chapter._count?.episodes ?? chapter.episodes?.length ?? 0,
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
    errorMessage: run.errorMessage ?? null,
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
        recentEpisodes
      ] = await Promise.all([
        getComicProjectInternal(),
        prisma.comicCharacter.count(),
        prisma.comicScene.count(),
        prisma.comicSeason.count(),
        prisma.comicChapter.count(),
        prisma.comicEpisode.count(),
        prisma.comicEpisode.count({ where: { published: true } }),
        prisma.comicEpisode.findMany({
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
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 6
        })
      ]);

      return {
        project: project ? mapComicProject(project) : null,
        characterCount,
        sceneCount,
        seasonCount,
        chapterCount,
        episodeCount,
        publishedEpisodeCount,
        recentEpisodes: recentEpisodes.map((episode) => ({
          ...mapComicEpisode(episode),
          seasonTitle: episode.chapter.season.title,
          seasonSlug: episode.chapter.season.slug,
          chapterTitle: episode.chapter.title,
          chapterSlug: episode.chapter.slug
        }))
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

export async function getComicEpisodeById(id: string) {
  return withComicFallback<ComicEpisodeDetailRecord | null>(
    async () => {
      const episode = await prisma.comicEpisode.findUnique({
        where: { id },
        include: {
          chapter: {
            include: {
              season: {
                include: {
                  project: true
                }
              }
            }
          },
          assets: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          },
          promptRuns: {
            orderBy: [{ createdAt: "desc" }]
          }
        }
      });

      if (!episode) {
        return null;
      }

      const [characters, scenes, chapterSceneReferenceState] = await Promise.all([
        prisma.comicCharacter.findMany({
          where: { projectId: episode.chapter.season.projectId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        prisma.comicScene.findMany({
          where: { projectId: episode.chapter.season.projectId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }),
        loadComicChapterSceneReferenceState(episode.chapter.season.slug, episode.chapter.slug)
      ]);

      return {
        project: episode.chapter.season.project ? mapComicProject(episode.chapter.season.project) : null,
        season: mapComicSeason(episode.chapter.season),
        chapter: mapComicChapter(episode.chapter),
        episode: mapComicEpisode(episode),
        assets: episode.assets.map(mapComicEpisodeAsset),
        promptRuns: episode.promptRuns.map(mapComicPromptRun),
        characters: characters.map(mapComicCharacter),
        scenes: scenes.map(mapComicScene),
        chapterSceneReferenceFolder: chapterSceneReferenceState.chapterSceneReferenceFolder,
        chapterSceneReferences: chapterSceneReferenceState.chapterSceneReferences
      };
    },
    null
  );
}

export async function getComicPromptStudioPage(selectedEpisodeId?: string | null) {
  return withComicFallback<ComicPromptStudioPageRecord>(
    async () => {
      const [project, characters, scenes, seasons, selectedEpisode] = await Promise.all([
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
        }),
        selectedEpisodeId ? getComicEpisodeById(selectedEpisodeId) : Promise.resolve(null)
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
        })),
        selectedEpisode
      };
    },
    {
      project: null,
      characters: [],
      scenes: [],
      seasons: [],
      selectedEpisode: null
    }
  );
}

const COMIC_REQUIRED_PAGES_PER_EPISODE = 10;
const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];

type ComicPageApprovalCandidate = Pick<
  ComicEpisodeAssetRecord,
  "assetType" | "published" | "sortOrder"
>;

function isComicPageAsset(asset: ComicPageApprovalCandidate) {
  return COMIC_PAGE_ASSET_TYPES.includes(asset.assetType);
}

function isRequiredComicPageNumber(pageNumber: number) {
  return pageNumber >= 1 && pageNumber <= COMIC_REQUIRED_PAGES_PER_EPISODE;
}

function getApprovedRequiredPageCount(assets: ComicPageApprovalCandidate[]) {
  return new Set(
    assets
      .filter(
        (asset) =>
          isComicPageAsset(asset) && asset.published && isRequiredComicPageNumber(asset.sortOrder)
      )
      .map((asset) => asset.sortOrder)
  ).size;
}

function hasAllRequiredComicPages(assets: ComicPageApprovalCandidate[]) {
  return getApprovedRequiredPageCount(assets) === COMIC_REQUIRED_PAGES_PER_EPISODE;
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
                include: {
                  _count: {
                    select: {
                      assets: true,
                      promptRuns: true
                    }
                  },
                  promptRuns: {
                    where: {
                      promptType: "PAGE_IMAGE_GENERATION"
                    },
                    orderBy: [{ createdAt: "desc" }],
                    take: 1
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

            const assets = episode.assets.map(mapComicEpisodeAsset);
            const pageAssets = assets.filter(isComicPageAsset);
            const draftPages = pageAssets.filter((asset) => !asset.published);
            const approvedPageCount = getApprovedRequiredPageCount(pageAssets);
            const draftPageCount = draftPages.length;
            const canPublish = approvedPageCount === COMIC_REQUIRED_PAGES_PER_EPISODE;
            const latestImageGenerationRun = episode.promptRuns[0] || null;

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
              draftPageCount,
              requiredPageCount: COMIC_REQUIRED_PAGES_PER_EPISODE,
              canPublish,
              latestImageGenerationAt: latestImageGenerationRun?.createdAt
                ? new Date(latestImageGenerationRun.createdAt)
                : null,
              latestImageGenerationStatus: latestImageGenerationRun?.status ?? null,
              latestImageGenerationSummary: latestImageGenerationRun?.outputSummary ?? null,
              latestImageGenerationError: latestImageGenerationRun?.errorMessage ?? null,
              assets
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

export async function getPublishedComicLibrary() {
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
                      sortOrder: { gte: 1, lte: COMIC_REQUIRED_PAGES_PER_EPISODE }
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
                      sortOrder: { gte: 1, lte: COMIC_REQUIRED_PAGES_PER_EPISODE }
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
                      sortOrder: { gte: 1, lte: COMIC_REQUIRED_PAGES_PER_EPISODE }
                    }
                  }
                },
                include: {
                  assets: {
                    where: {
                      published: true,
                      assetType: { in: COMIC_PAGE_ASSET_TYPES },
                      sortOrder: { gte: 1, lte: COMIC_REQUIRED_PAGES_PER_EPISODE }
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
              const episodes = chapter.episodes
                .filter((episode) => hasAllRequiredComicPages(episode.assets))
                .map((episode): ComicPublicEpisodeRecord => ({
                  ...mapComicEpisode(episode),
                  assets: episode.assets.map(mapComicEpisodeAsset),
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

export async function getPublishedComicSeasonBySlug(seasonSlug: string) {
  const seasons = await getPublishedComicLibrary();
  return seasons.find((season) => season.slug === seasonSlug) ?? null;
}

export async function getPublishedComicChapterBySlugs(seasonSlug: string, chapterSlug: string) {
  const season = await getPublishedComicSeasonBySlug(seasonSlug);
  if (!season) {
    return null;
  }

  return season.chapters.find((chapter) => chapter.slug === chapterSlug) ?? null;
}

export async function getPublishedComicEpisodeBySlugs(
  seasonSlug: string,
  chapterSlug: string,
  episodeSlug: string
) {
  const chapter = await getPublishedComicChapterBySlugs(seasonSlug, chapterSlug);
  if (!chapter) {
    return null;
  }

  return chapter.episodes.find((episode) => episode.slug === episodeSlug) ?? null;
}
