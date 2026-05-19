"use server";

import { redirect } from "next/navigation";
import { requireFullAdminSession } from "@/lib/admin-auth";
import {
  formatComicBilingualOutline,
  formatComicBilingualSummary
} from "@/lib/comic-bilingual-outline";
import { toComicCharacterChineseNameLocks } from "@/lib/comic-character-chinese-names";
import { getNextComicEpisodeNumber } from "@/lib/comic-episode-numbering";
import {
  formatComicProductLockPromptContext,
  loadComicProductLockPromptContexts
} from "@/lib/comic-product-locks";
import { prisma } from "@/lib/db";
import { toInt, toPlainString } from "@/lib/utils";
import {
  buildComicRedirect,
  buildComicSlug,
  normalizeLongText,
  revalidateComicRoutes
} from "@/app/admin/comic-action-helpers";

const EXTRA_STORY_OUTLINE_PATH = "/admin/comic/extra-story-outline";
const EXTRA_STORY_PUBLISH_PATH = "/admin/comic/extra-story-publish-center";
const EXTRA_STORY_TYPE = "EXTRA";

async function loadComicWorkspaceModule() {
  return import("@/lib/comic-workspace");
}

function deriveExtraStoryTitle(userRequest: string, episodeNumber: number) {
  const firstLine = userRequest
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const compact = (firstLine || "")
    .replace(/^#+\s*/, "")
    .replace(/[^\w\s\u4e00-\u9fff-]+/g, "")
    .trim()
    .slice(0, 56);

  return compact ? `Extra Story: ${compact}` : `Extra Story ${episodeNumber}`;
}

async function getUniqueEpisodeSlug(chapterId: string, requestedSlug: string, episodeNumber: number) {
  const baseSlug = requestedSlug || `extra-story-${episodeNumber}`;
  const existing = await prisma.comicEpisode.findFirst({
    where: {
      chapterId,
      slug: baseSlug
    },
    select: {
      id: true
    }
  });

  return existing ? `${baseSlug}-${episodeNumber}` : baseSlug;
}

async function getComicOutlineSupport(projectId: string) {
  const [characters, scenes] = await Promise.all([
    prisma.comicCharacter.findMany({
      where: { projectId, active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { name: true, slug: true, chineseName: true }
    }),
    prisma.comicScene.findMany({
      where: { projectId, active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { name: true }
    })
  ]);

  return {
    characterNames: characters.map((character) => character.name),
    characterNameLocks: toComicCharacterChineseNameLocks(characters),
    sceneNames: scenes.map((scene) => scene.name)
  };
}

function getProjectChain(project: {
  title: string;
  shortDescription: string;
  storyOutline: string;
}) {
  return {
    level: "PROJECT" as const,
    title: project.title,
    summary: project.shortDescription,
    outline: project.storyOutline
  };
}

function getSeasonChain(season: {
  seasonNumber: number;
  title: string;
  summary: string;
  outline: string;
}) {
  return {
    level: "SEASON" as const,
    title: `Season ${season.seasonNumber}: ${season.title}`,
    summary: season.summary,
    outline: season.outline
  };
}

function getChapterChain(chapter: {
  chapterNumber: number;
  title: string;
  summary: string;
  outline: string;
}) {
  return {
    level: "CHAPTER" as const,
    title: `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
    summary: chapter.summary,
    outline: chapter.outline
  };
}

function toChildContext(input: {
  label: string;
  title: string;
  summary?: string | null;
  outline?: string | null;
}) {
  return {
    label: input.label,
    title: input.title,
    summary: input.summary || null,
    outline: input.outline || null
  };
}

function formatExtraStoryRevisionNotes(input: {
  userRequest: string;
  parentEpisode: { episodeNumber: number; title: string; summary: string; outline: string };
  productLockSummary: string;
}) {
  return [
    "Generate a bilingual outline for a Neatique Extra Story.",
    "This is a side story, character intro, product-use moment, or product interaction page sequence. It should feel lively and useful without disrupting the main episode canon.",
    `User request:\n${input.userRequest}`,
    "",
    `Publish placement: after Episode ${input.parentEpisode.episodeNumber}: ${input.parentEpisode.title}`,
    `Parent episode summary:\n${input.parentEpisode.summary}`,
    `Parent episode outline:\n${input.parentEpisode.outline}`,
    "",
    "Product locks available for this extra story:",
    input.productLockSummary,
    "",
    "If a product is mentioned, keep its product design locked: simple bottle, front label only shows the big product code, no small packaging text."
  ].join("\n");
}

export async function createComicExtraStoryOutlineAction(formData: FormData) {
  await requireFullAdminSession();
  const { ensureComicEpisodeWorkspace } = await loadComicWorkspaceModule();

  const parentEpisodeId = toPlainString(formData.get("parentEpisodeId"));
  const userRequest = normalizeLongText(formData.get("userRequest"));

  if (!parentEpisodeId) {
    redirect(buildComicRedirect(EXTRA_STORY_OUTLINE_PATH, "missing-parent-episode"));
  }

  if (!userRequest) {
    redirect(buildComicRedirect(EXTRA_STORY_OUTLINE_PATH, "missing-extra-story-request"));
  }

  const parentEpisode = await prisma.comicEpisode.findUnique({
    where: { id: parentEpisodeId },
    include: {
      chapter: {
        include: {
          episodes: {
            where: {
              storyType: "MAIN"
            },
            orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          },
          season: {
            include: {
              project: true
            }
          }
        }
      }
    }
  });

  if (!parentEpisode?.chapter.season.project) {
    redirect(buildComicRedirect(EXTRA_STORY_OUTLINE_PATH, "missing-parent-episode"));
  }

  const episodeNumber = await getNextComicEpisodeNumber();
  const title =
    toPlainString(formData.get("title")) || deriveExtraStoryTitle(userRequest, episodeNumber);
  const slug = await getUniqueEpisodeSlug(
    parentEpisode.chapterId,
    buildComicSlug(formData.get("slug"), title),
    episodeNumber
  );
  const placementOrder =
    toInt(formData.get("extraStoryPlacementOrder"), 0) ||
    (await prisma.comicEpisode.count({
      where: {
        storyType: EXTRA_STORY_TYPE,
        extraStoryParentEpisodeId: parentEpisode.id
      }
    }));

  const fallbackSummary = formatComicBilingualSummary({
    zh: `番外篇草稿：${title}`,
    en: `Extra story draft: ${title}`
  });
  const fallbackOutline = formatComicBilingualOutline({
    zh: userRequest,
    en: userRequest
  });

  const episode = await prisma.comicEpisode.create({
    data: {
      chapterId: parentEpisode.chapterId,
      episodeNumber,
      slug,
      title,
      summary: fallbackSummary,
      outline: fallbackOutline,
      script: "",
      panelPlan: "",
      promptPack: "",
      requiredReferences: "",
      storyType: EXTRA_STORY_TYPE,
      extraStoryParentEpisodeId: parentEpisode.id,
      extraStoryPlacementOrder: placementOrder,
      published: false,
      publishedAt: null,
      sortOrder: episodeNumber
    }
  });

  let status = "extra-story-created";

  try {
    const [{ generateChineseComicOutlineWithAi }, support, productLocks] = await Promise.all([
      import("@/lib/openai-comic"),
      getComicOutlineSupport(parentEpisode.chapter.season.projectId),
      loadComicProductLockPromptContexts(userRequest)
    ]);
    const result = await generateChineseComicOutlineWithAi({
      level: "EPISODE",
      title,
      numberLabel: "Extra Story",
      existingSummary: "",
      existingOutline: userRequest,
      revisionNotes: formatExtraStoryRevisionNotes({
        userRequest,
        parentEpisode,
        productLockSummary: formatComicProductLockPromptContext(productLocks)
      }),
      parentChain: [
        getProjectChain(parentEpisode.chapter.season.project),
        getSeasonChain(parentEpisode.chapter.season),
        getChapterChain(parentEpisode.chapter)
      ],
      siblingOutlines: [
        toChildContext({
          label: `Parent Episode ${parentEpisode.episodeNumber}`,
          title: parentEpisode.title,
          summary: parentEpisode.summary,
          outline: parentEpisode.outline
        }),
        ...parentEpisode.chapter.episodes.map((candidate) =>
          toChildContext({
            label: `Episode ${candidate.episodeNumber}`,
            title: candidate.title,
            summary: candidate.summary,
            outline: candidate.outline
          })
        )
      ],
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: parentEpisode.chapter.season.project.worldRules,
      visualStyleGuide: parentEpisode.chapter.season.project.visualStyleGuide
    });

    await prisma.comicEpisode.update({
      where: {
        id: episode.id
      },
      data: {
        summary: formatComicBilingualSummary({
          zh: result.summary,
          en: result.summaryEn
        }),
        outline: formatComicBilingualOutline({
          zh: result.outline,
          en: result.outlineEn
        })
      }
    });
  } catch (error) {
    console.error("Extra story outline generation failed:", error);
    status = "extra-story-created-outline-failed";
  }

  await ensureComicEpisodeWorkspace({
    seasonSlug: parentEpisode.chapter.season.slug,
    seasonTitle: parentEpisode.chapter.season.title,
    chapterSlug: parentEpisode.chapter.slug,
    chapterTitle: parentEpisode.chapter.title,
    episodeSlug: episode.slug,
    episodeTitle: episode.title
  });
  revalidateComicRoutes({
    seasonSlug: parentEpisode.chapter.season.slug,
    chapterSlug: parentEpisode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(`${EXTRA_STORY_OUTLINE_PATH}?storyId=${episode.id}`, status));
}

export async function updateComicExtraStoryOutlineAction(formData: FormData) {
  await requireFullAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const title = toPlainString(formData.get("title"));
  const summary = normalizeLongText(formData.get("summary"));
  const outline = normalizeLongText(formData.get("outline"));

  if (!episodeId) {
    redirect(buildComicRedirect(EXTRA_STORY_OUTLINE_PATH, "missing-extra-story"));
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

  if (!episode || episode.storyType !== EXTRA_STORY_TYPE) {
    redirect(buildComicRedirect(EXTRA_STORY_OUTLINE_PATH, "missing-extra-story"));
  }

  await prisma.comicEpisode.update({
    where: {
      id: episode.id
    },
    data: {
      title: title || episode.title,
      summary: summary || episode.summary,
      outline: outline || episode.outline
    }
  });

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(`${EXTRA_STORY_OUTLINE_PATH}?storyId=${episode.id}`, "extra-story-saved"));
}

export async function updateComicExtraStoryPlacementAction(formData: FormData) {
  await requireFullAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const parentEpisodeId = toPlainString(formData.get("parentEpisodeId"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || EXTRA_STORY_PUBLISH_PATH;

  if (!episodeId || !parentEpisodeId) {
    redirect(buildComicRedirect(redirectTo, "missing-extra-story-placement"));
  }

  const [episode, parentEpisode] = await Promise.all([
    prisma.comicEpisode.findUnique({
      where: { id: episodeId },
      include: {
        chapter: {
          include: {
            season: true
          }
        }
      }
    }),
    prisma.comicEpisode.findUnique({
      where: { id: parentEpisodeId },
      include: {
        chapter: {
          include: {
            season: true
          }
        }
      }
    })
  ]);

  if (!episode || episode.storyType !== EXTRA_STORY_TYPE || !parentEpisode) {
    redirect(buildComicRedirect(redirectTo, "missing-extra-story-placement"));
  }

  await prisma.comicEpisode.update({
    where: {
      id: episode.id
    },
    data: {
      chapterId: parentEpisode.chapterId,
      extraStoryParentEpisodeId: parentEpisode.id,
      extraStoryPlacementOrder: Math.max(0, toInt(formData.get("extraStoryPlacementOrder"), 0))
    }
  });

  revalidateComicRoutes({
    seasonSlug: parentEpisode.chapter.season.slug,
    chapterSlug: parentEpisode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, "extra-story-placement-saved"));
}
