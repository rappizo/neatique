"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  formatComicBilingualOutline,
  formatComicBilingualSummary
} from "@/lib/comic-bilingual-outline";
import { prisma } from "@/lib/db";
import { toComicCharacterChineseNameLocks } from "@/lib/comic-character-chinese-names";
import { toPlainString } from "@/lib/utils";
import {
  buildComicRedirect,
  ensureComicProjectId,
  revalidateComicRoutes
} from "@/app/admin/comic-action-helpers";

const OUTLINE_STUDIO_PATH = "/admin/comic/outline-studio";
const PLACEHOLDER_OUTLINES = [
  "Add the full multi-season story outline here.",
  "Add the season outline here.",
  "Add the chapter outline here.",
  "Add the episode outline here."
];

function getRedirectTarget(formData: FormData) {
  return toPlainString(formData.get("redirectTo")) || OUTLINE_STUDIO_PATH;
}

function getRevisionNotes(formData: FormData) {
  return toPlainString(formData.get("revisionNotes"));
}

function hasUsableOutline(value?: string | null) {
  const normalized = (value || "").trim();

  return Boolean(normalized && !PLACEHOLDER_OUTLINES.includes(normalized));
}

function hasChineseText(value?: string | null) {
  return /[\u4e00-\u9fff]/.test(value || "");
}

function toStoredBilingualOutline(input: { outline: string; outlineEn?: string | null }) {
  return formatComicBilingualOutline({
    zh: input.outline,
    en: input.outlineEn
  });
}

function toStoredBilingualSummary(input: { summary: string; summaryEn?: string | null }) {
  return formatComicBilingualSummary({
    zh: input.summary,
    en: input.summaryEn
  });
}

function toNumberLabel(label: string, value: number) {
  return `${label} ${value}`;
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
    title: `${toNumberLabel("Season", season.seasonNumber)}: ${season.title}`,
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
    title: `${toNumberLabel("Chapter", chapter.chapterNumber)}: ${chapter.title}`,
    summary: chapter.summary,
    outline: chapter.outline
  };
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

export async function translateComicProjectOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const project = await prisma.comicProject.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(project.storyOutline)) {
    redirect(buildComicRedirect(redirectTo, "missing-outline"));
  }

  if (hasChineseText(project.storyOutline)) {
    redirect(buildComicRedirect(redirectTo, "outline-already-chinese"));
  }

  let status = "project-outline-translated";

  try {
    const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(project.id);
    const result = await translateChineseComicOutlineWithAi({
      level: "PROJECT",
      title: project.title,
      summary: project.shortDescription,
      outline: project.storyOutline,
      translationNotes: getRevisionNotes(formData),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks
    });

    await prisma.comicProject.update({
      where: { id: project.id },
      data: {
        shortDescription: toStoredBilingualSummary(result),
        storyOutline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-translation-failed";
  }

  revalidateComicRoutes();
  redirect(buildComicRedirect(redirectTo, status));
}

export async function translateComicSeasonOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const seasonId = toPlainString(formData.get("seasonId"));

  if (!seasonId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const season = await prisma.comicSeason.findUnique({
    where: { id: seasonId }
  });

  if (!season) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(season.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-outline"));
  }

  if (hasChineseText(season.outline)) {
    redirect(buildComicRedirect(redirectTo, "outline-already-chinese"));
  }

  let status = "season-outline-translated";

  try {
    const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(season.projectId);
    const result = await translateChineseComicOutlineWithAi({
      level: "SEASON",
      title: season.title,
      summary: season.summary,
      outline: season.outline,
      translationNotes: getRevisionNotes(formData),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks
    });

    await prisma.comicSeason.update({
      where: { id: season.id },
      data: {
        summary: toStoredBilingualSummary(result),
        outline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-translation-failed";
  }

  revalidateComicRoutes({ seasonSlug: season.slug });
  redirect(buildComicRedirect(redirectTo, status));
}

export async function translateComicChapterOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const chapterId = toPlainString(formData.get("chapterId"));

  if (!chapterId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const chapter = await prisma.comicChapter.findUnique({
    where: { id: chapterId },
    include: {
      season: true
    }
  });

  if (!chapter) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(chapter.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-outline"));
  }

  if (hasChineseText(chapter.outline)) {
    redirect(buildComicRedirect(redirectTo, "outline-already-chinese"));
  }

  let status = "chapter-outline-translated";

  try {
    const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(chapter.season.projectId);
    const result = await translateChineseComicOutlineWithAi({
      level: "CHAPTER",
      title: chapter.title,
      summary: chapter.summary,
      outline: chapter.outline,
      translationNotes: getRevisionNotes(formData),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks
    });

    await prisma.comicChapter.update({
      where: { id: chapter.id },
      data: {
        summary: toStoredBilingualSummary(result),
        outline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-translation-failed";
  }

  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug
  });
  redirect(buildComicRedirect(redirectTo, status));
}
export async function translateComicEpisodeOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const episodeId = toPlainString(formData.get("episodeId"));

  if (!episodeId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
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
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(episode.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-outline"));
  }

  if (hasChineseText(episode.outline)) {
    redirect(buildComicRedirect(redirectTo, "outline-already-chinese"));
  }

  let status = "episode-outline-translated";

  try {
    const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(episode.chapter.season.projectId);
    const result = await translateChineseComicOutlineWithAi({
      level: "EPISODE",
      title: episode.title,
      summary: episode.summary,
      outline: episode.outline,
      translationNotes: getRevisionNotes(formData),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks
    });

    await prisma.comicEpisode.update({
      where: { id: episode.id },
      data: {
        summary: toStoredBilingualSummary(result),
        outline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-translation-failed";
  }

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicProjectOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const project = await prisma.comicProject.findUnique({
    where: { id: projectId },
    include: {
      seasons: {
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  let status = "project-outline-generated";

  try {
    const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(project.id);
    const result = await generateChineseComicOutlineWithAi({
      level: "PROJECT",
      title: project.title,
      existingSummary: project.shortDescription,
      existingOutline: project.storyOutline,
      revisionNotes: getRevisionNotes(formData),
      childTargets: project.seasons.map((season) =>
        toChildContext({
          label: toNumberLabel("Season", season.seasonNumber),
          title: season.title,
          summary: season.summary,
          outline: season.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: project.worldRules,
      visualStyleGuide: project.visualStyleGuide
    });

    await prisma.comicProject.update({
      where: { id: project.id },
      data: {
        shortDescription: toStoredBilingualSummary(result),
        storyOutline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes();
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicSeasonOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const seasonId = toPlainString(formData.get("seasonId"));

  if (!seasonId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const season = await prisma.comicSeason.findUnique({
    where: { id: seasonId },
    include: {
      project: {
        include: {
          seasons: {
            orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      chapters: {
        orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!season?.project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(season.project.storyOutline)) {
    redirect(buildComicRedirect(redirectTo, "missing-parent-outline"));
  }

  let status = "season-outline-generated";

  try {
    const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(season.projectId);
    const result = await generateChineseComicOutlineWithAi({
      level: "SEASON",
      title: season.title,
      numberLabel: toNumberLabel("Season", season.seasonNumber),
      existingSummary: season.summary,
      existingOutline: season.outline,
      revisionNotes: getRevisionNotes(formData),
      parentChain: [getProjectChain(season.project)],
      siblingOutlines: season.project.seasons.map((candidate) =>
        toChildContext({
          label: toNumberLabel("Season", candidate.seasonNumber),
          title: candidate.title,
          summary: candidate.summary,
          outline: candidate.outline
        })
      ),
      childTargets: season.chapters.map((chapter) =>
        toChildContext({
          label: toNumberLabel("Chapter", chapter.chapterNumber),
          title: chapter.title,
          summary: chapter.summary,
          outline: chapter.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: season.project.worldRules,
      visualStyleGuide: season.project.visualStyleGuide
    });

    await prisma.comicSeason.update({
      where: { id: season.id },
      data: {
        summary: toStoredBilingualSummary(result),
        outline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes({ seasonSlug: season.slug });
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicChapterOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const chapterId = toPlainString(formData.get("chapterId"));

  if (!chapterId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const chapter = await prisma.comicChapter.findUnique({
    where: { id: chapterId },
    include: {
      season: {
        include: {
          project: true,
          chapters: {
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      episodes: {
        orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!chapter?.season.project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(chapter.season.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-parent-outline"));
  }

  let status = "chapter-outline-generated";

  try {
    const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(chapter.season.projectId);
    const result = await generateChineseComicOutlineWithAi({
      level: "CHAPTER",
      title: chapter.title,
      numberLabel: toNumberLabel("Chapter", chapter.chapterNumber),
      existingSummary: chapter.summary,
      existingOutline: chapter.outline,
      revisionNotes: getRevisionNotes(formData),
      parentChain: [
        getProjectChain(chapter.season.project),
        getSeasonChain(chapter.season)
      ],
      siblingOutlines: chapter.season.chapters.map((candidate) =>
        toChildContext({
          label: toNumberLabel("Chapter", candidate.chapterNumber),
          title: candidate.title,
          summary: candidate.summary,
          outline: candidate.outline
        })
      ),
      childTargets: chapter.episodes.map((episode) =>
        toChildContext({
          label: toNumberLabel("Episode", episode.episodeNumber),
          title: episode.title,
          summary: episode.summary,
          outline: episode.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: chapter.season.project.worldRules,
      visualStyleGuide: chapter.season.project.visualStyleGuide
    });

    await prisma.comicChapter.update({
      where: { id: chapter.id },
      data: {
        summary: toStoredBilingualSummary(result),
        outline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug
  });
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicEpisodeOutlineAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const episodeId = toPlainString(formData.get("episodeId"));

  if (!episodeId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      chapter: {
        include: {
          episodes: {
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

  if (!episode?.chapter.season.project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(episode.chapter.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-parent-outline"));
  }

  let status = "episode-outline-generated";

  try {
    const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(episode.chapter.season.projectId);
    const result = await generateChineseComicOutlineWithAi({
      level: "EPISODE",
      title: episode.title,
      numberLabel: toNumberLabel("Episode", episode.episodeNumber),
      existingSummary: episode.summary,
      existingOutline: episode.outline,
      revisionNotes: getRevisionNotes(formData),
      parentChain: [
        getProjectChain(episode.chapter.season.project),
        getSeasonChain(episode.chapter.season),
        getChapterChain(episode.chapter)
      ],
      siblingOutlines: episode.chapter.episodes.map((candidate) =>
        toChildContext({
          label: toNumberLabel("Episode", candidate.episodeNumber),
          title: candidate.title,
          summary: candidate.summary,
          outline: candidate.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: episode.chapter.season.project.worldRules,
      visualStyleGuide: episode.chapter.season.project.visualStyleGuide
    });

    await prisma.comicEpisode.update({
      where: { id: episode.id },
      data: {
        summary: toStoredBilingualSummary(result),
        outline: toStoredBilingualOutline(result)
      }
    });
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicSeasonOutlinesAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const project = await prisma.comicProject.findUnique({
    where: { id: projectId },
    include: {
      seasons: {
        include: {
          chapters: {
            orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(project.storyOutline)) {
    redirect(buildComicRedirect(redirectTo, "missing-parent-outline"));
  }

  if (project.seasons.length === 0) {
    redirect(buildComicRedirect(redirectTo, "missing-children"));
  }

  let status = "season-outlines-generated";

  try {
    const { generateChineseComicChildOutlinesWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(project.id);
    const outlines = await generateChineseComicChildOutlinesWithAi({
      childLevel: "SEASON",
      parent: getProjectChain(project),
      children: project.seasons.map((season) => ({
        id: season.id,
        title: season.title,
        numberLabel: toNumberLabel("Season", season.seasonNumber),
        existingSummary: season.summary,
        existingOutline: season.outline,
        childTargets: season.chapters.map((chapter) =>
          toChildContext({
            label: toNumberLabel("Chapter", chapter.chapterNumber),
            title: chapter.title,
            summary: chapter.summary,
            outline: chapter.outline
          })
        )
      })),
      revisionNotes: getRevisionNotes(formData),
      siblingContext: project.seasons.map((season) =>
        toChildContext({
          label: toNumberLabel("Season", season.seasonNumber),
          title: season.title,
          summary: season.summary,
          outline: season.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: project.worldRules,
      visualStyleGuide: project.visualStyleGuide
    });

    await prisma.$transaction(
      outlines.map((outline) =>
        prisma.comicSeason.update({
          where: { id: outline.id },
          data: {
            summary: toStoredBilingualSummary(outline),
            outline: toStoredBilingualOutline(outline)
          }
        })
      )
    );
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes();
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicChapterOutlinesAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const seasonId = toPlainString(formData.get("seasonId"));

  if (!seasonId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const season = await prisma.comicSeason.findUnique({
    where: { id: seasonId },
    include: {
      project: true,
      chapters: {
        include: {
          episodes: {
            orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!season?.project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(season.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-parent-outline"));
  }

  if (season.chapters.length === 0) {
    redirect(buildComicRedirect(redirectTo, "missing-children"));
  }

  let status = "chapter-outlines-generated";

  try {
    const { generateChineseComicChildOutlinesWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(season.projectId);
    const outlines = await generateChineseComicChildOutlinesWithAi({
      childLevel: "CHAPTER",
      parent: getSeasonChain(season),
      parentChain: [getProjectChain(season.project)],
      children: season.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        numberLabel: toNumberLabel("Chapter", chapter.chapterNumber),
        existingSummary: chapter.summary,
        existingOutline: chapter.outline,
        childTargets: chapter.episodes.map((episode) =>
          toChildContext({
            label: toNumberLabel("Episode", episode.episodeNumber),
            title: episode.title,
            summary: episode.summary,
            outline: episode.outline
          })
        )
      })),
      revisionNotes: getRevisionNotes(formData),
      siblingContext: season.chapters.map((chapter) =>
        toChildContext({
          label: toNumberLabel("Chapter", chapter.chapterNumber),
          title: chapter.title,
          summary: chapter.summary,
          outline: chapter.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: season.project.worldRules,
      visualStyleGuide: season.project.visualStyleGuide
    });

    await prisma.$transaction(
      outlines.map((outline) =>
        prisma.comicChapter.update({
          where: { id: outline.id },
          data: {
            summary: toStoredBilingualSummary(outline),
            outline: toStoredBilingualOutline(outline)
          }
        })
      )
    );
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes({ seasonSlug: season.slug });
  redirect(buildComicRedirect(redirectTo, status));
}

export async function generateComicEpisodeOutlinesAction(formData: FormData) {
  await requireAdminSession();

  const redirectTo = getRedirectTarget(formData);
  const chapterId = toPlainString(formData.get("chapterId"));

  if (!chapterId) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  const chapter = await prisma.comicChapter.findUnique({
    where: { id: chapterId },
    include: {
      episodes: {
        orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      },
      season: {
        include: {
          project: true
        }
      }
    }
  });

  if (!chapter?.season.project) {
    redirect(buildComicRedirect(redirectTo, "missing-record"));
  }

  if (!hasUsableOutline(chapter.outline)) {
    redirect(buildComicRedirect(redirectTo, "missing-parent-outline"));
  }

  if (chapter.episodes.length === 0) {
    redirect(buildComicRedirect(redirectTo, "missing-children"));
  }

  let status = "episode-outlines-generated";

  try {
    const { generateChineseComicChildOutlinesWithAi } = await import("@/lib/openai-comic");
    const support = await getComicOutlineSupport(chapter.season.projectId);
    const outlines = await generateChineseComicChildOutlinesWithAi({
      childLevel: "EPISODE",
      parent: getChapterChain(chapter),
      parentChain: [
        getProjectChain(chapter.season.project),
        getSeasonChain(chapter.season)
      ],
      children: chapter.episodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        numberLabel: toNumberLabel("Episode", episode.episodeNumber),
        existingSummary: episode.summary,
        existingOutline: episode.outline
      })),
      revisionNotes: getRevisionNotes(formData),
      siblingContext: chapter.episodes.map((episode) =>
        toChildContext({
          label: toNumberLabel("Episode", episode.episodeNumber),
          title: episode.title,
          summary: episode.summary,
          outline: episode.outline
        })
      ),
      characterNames: support.characterNames,
      characterNameLocks: support.characterNameLocks,
      sceneNames: support.sceneNames,
      worldRules: chapter.season.project.worldRules,
      visualStyleGuide: chapter.season.project.visualStyleGuide
    });

    await prisma.$transaction(
      outlines.map((outline) =>
        prisma.comicEpisode.update({
          where: { id: outline.id },
          data: {
            summary: toStoredBilingualSummary(outline),
            outline: toStoredBilingualOutline(outline)
          }
        })
      )
    );
  } catch {
    status = "outline-failed";
  }

  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug
  });
  redirect(buildComicRedirect(redirectTo, status));
}
