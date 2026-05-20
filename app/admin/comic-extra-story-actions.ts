"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireFullAdminSession } from "@/lib/admin-auth";
import {
  formatComicBilingualOutline,
  formatComicBilingualSummary
} from "@/lib/comic-bilingual-outline";
import { enqueueComicAiTask } from "@/lib/comic-ai-task-queue";
import { getNextComicEpisodeNumber } from "@/lib/comic-episode-numbering";
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

  await enqueueComicAiTask({
    taskType: "outline",
    label: `Extra-story outline: ${title}`,
    payload: {
      taskType: "extra-story-generate",
      targetId: episode.id,
      userRequest,
      revisionNotes: ""
    }
  });

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
  redirect(buildComicRedirect(`${EXTRA_STORY_OUTLINE_PATH}?storyId=${episode.id}`, "extra-story-outline-queued"));
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

export async function deleteComicExtraStoryAction(formData: FormData) {
  await requireFullAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || EXTRA_STORY_OUTLINE_PATH;

  if (!episodeId) {
    redirect(buildComicRedirect(redirectTo, "missing-extra-story"));
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      assets: {
        select: {
          id: true
        }
      },
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode || episode.storyType !== EXTRA_STORY_TYPE) {
    redirect(buildComicRedirect(redirectTo, "missing-extra-story"));
  }

  const taskFilters: Prisma.ComicAiTaskWhereInput[] = [
    { episodeId: episode.id },
    { targetId: episode.id }
  ];
  const assetIds = episode.assets.map((asset) => asset.id);

  if (assetIds.length > 0) {
    taskFilters.push({
      sourceAssetId: {
        in: assetIds
      }
    });
  }

  await prisma.$transaction([
    prisma.comicAiTask.deleteMany({
      where: {
        OR: taskFilters
      }
    }),
    prisma.comicEpisode.delete({
      where: {
        id: episode.id
      }
    })
  ]);

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, "extra-story-deleted"));
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
