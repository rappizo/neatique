import { ensureComicProjectId, revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import {
  formatComicBilingualOutline,
  formatComicBilingualSummary
} from "@/lib/comic-bilingual-outline";
import { toComicCharacterChineseNameLocks } from "@/lib/comic-character-chinese-names";
import {
  writeGeneratedChapterOutlineToWorkspace,
  writeGeneratedEpisodeOutlineToWorkspace,
  writeGeneratedSeasonOutlineToWorkspace
} from "@/lib/comic-outline-workspace";
import {
  createComicGeneratedOutlineSnapshot,
  type ComicGeneratedOutlineContent,
  type ComicGeneratedOutlineSnapshot,
  type ComicOutlineSnapshotLevel
} from "@/lib/comic-outline-snapshots";
import { prisma } from "@/lib/db";

export type ComicOutlineTaskType =
  | "project-generate"
  | "project-translate"
  | "seasons-generate"
  | "season-generate"
  | "season-translate"
  | "chapters-generate"
  | "chapter-generate"
  | "chapter-translate"
  | "episodes-generate"
  | "episode-generate"
  | "episode-translate";

export type ComicOutlineTaskStatus =
  | "project-outline-generated"
  | "project-outline-translated"
  | "season-outline-generated"
  | "season-outline-translated"
  | "chapter-outline-generated"
  | "chapter-outline-translated"
  | "episode-outline-generated"
  | "episode-outline-translated"
  | "season-outlines-generated"
  | "chapter-outlines-generated"
  | "episode-outlines-generated"
  | "outline-failed"
  | "outline-translation-failed"
  | "missing-parent-outline"
  | "missing-outline"
  | "outline-already-chinese"
  | "missing-children"
  | "missing-record";

export type ComicOutlineTaskResult = {
  ok: boolean;
  status: ComicOutlineTaskStatus;
  taskType: ComicOutlineTaskType;
  targetId?: string;
  message: string;
  errorMessage?: string;
  generatedOutlines?: ComicGeneratedOutlineSnapshot[];
};

export class ComicOutlineTaskInputError extends Error {
  status: ComicOutlineTaskStatus;

  constructor(status: ComicOutlineTaskStatus, message: string) {
    super(message);
    this.name = "ComicOutlineTaskInputError";
    this.status = status;
  }
}
const PLACEHOLDER_OUTLINES = [
  "Add the full multi-season story outline here.",
  "Add the season outline here.",
  "Add the chapter outline here.",
  "Add the episode outline here."
];

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

function toGeneratedOutlineSnapshot(input: {
  taskType: ComicOutlineTaskType;
  level: ComicOutlineSnapshotLevel;
  id: string;
  title: string;
  numberLabel?: string | null;
  result: ComicGeneratedOutlineContent;
  revisionNotes?: string;
}) {
  return createComicGeneratedOutlineSnapshot({
    ...input,
    storedSummary: toStoredBilingualSummary(input.result),
    storedOutline: toStoredBilingualOutline(input.result)
  });
}

function normalizeGeneratedOutlineTitle(input: {
  generatedTitle?: string | null;
  fallbackTitle: string;
  numberLabel?: string | null;
}) {
  const generatedTitle = (input.generatedTitle || "").trim();
  const fallbackTitle = input.fallbackTitle.trim();
  const numberLabel = (input.numberLabel || "").trim();
  const withoutNumberLabel =
    numberLabel && generatedTitle
      ? generatedTitle.replace(new RegExp(`^${numberLabel}\\s*[-:]\\s*`, "i"), "").trim()
      : generatedTitle;

  return withoutNumberLabel || fallbackTitle;
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

function getFailureStatus(taskType: ComicOutlineTaskType): ComicOutlineTaskStatus {
  return taskType.endsWith("translate") ? "outline-translation-failed" : "outline-failed";
}

function success(
  taskType: ComicOutlineTaskType,
  status: ComicOutlineTaskStatus,
  message: string,
  targetId?: string,
  generatedOutlines?: ComicGeneratedOutlineSnapshot[]
): ComicOutlineTaskResult {
  const result: ComicOutlineTaskResult = {
    ok: true,
    status,
    taskType,
    targetId,
    message
  };

  if (generatedOutlines?.length) {
    result.generatedOutlines = generatedOutlines;
  }

  return result;
}

async function translateProjectOutline(taskType: ComicOutlineTaskType, targetId: string, revisionNotes?: string) {
  const projectId = await ensureComicProjectId(targetId);
  const project = await prisma.comicProject.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new ComicOutlineTaskInputError("missing-record", "Comic project could not be found.");
  }

  if (!hasUsableOutline(project.storyOutline)) {
    throw new ComicOutlineTaskInputError("missing-outline", "No project outline is available to translate.");
  }

  if (hasChineseText(project.storyOutline)) {
    throw new ComicOutlineTaskInputError("outline-already-chinese", "Project outline is already Chinese.");
  }

  const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(project.id);
  const result = await translateChineseComicOutlineWithAi({
    level: "PROJECT",
    title: project.title,
    summary: project.shortDescription,
    outline: project.storyOutline,
    translationNotes: revisionNotes,
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

  revalidateComicRoutes();
  return success(
    taskType,
    "project-outline-translated",
    `Translated ${project.title} into Chinese.`,
    project.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "PROJECT",
        id: project.id,
        title: project.title,
        result,
        revisionNotes
      })
    ]
  );
}

async function generateProjectOutline(taskType: ComicOutlineTaskType, targetId: string, revisionNotes?: string) {
  const projectId = await ensureComicProjectId(targetId);
  const project = await prisma.comicProject.findUnique({
    where: { id: projectId },
    include: {
      seasons: {
        orderBy: [{ seasonNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!project) {
    throw new ComicOutlineTaskInputError("missing-record", "Comic project could not be found.");
  }

  const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(project.id);
  const result = await generateChineseComicOutlineWithAi({
    level: "PROJECT",
    title: project.title,
    existingSummary: project.shortDescription,
    existingOutline: project.storyOutline,
    revisionNotes,
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

  revalidateComicRoutes();
  return success(
    taskType,
    "project-outline-generated",
    `Generated project outline for ${project.title}.`,
    project.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "PROJECT",
        id: project.id,
        title: project.title,
        result,
        revisionNotes
      })
    ]
  );
}

async function generateSeasonOutlines(taskType: ComicOutlineTaskType, projectIdInput: string, revisionNotes?: string) {
  const projectId = await ensureComicProjectId(projectIdInput);
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
    throw new ComicOutlineTaskInputError("missing-record", "Comic project could not be found.");
  }

  if (!hasUsableOutline(project.storyOutline)) {
    throw new ComicOutlineTaskInputError("missing-parent-outline", "Generate the project outline first.");
  }

  if (project.seasons.length === 0) {
    throw new ComicOutlineTaskInputError("missing-children", "No seasons are available.");
  }

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
    revisionNotes,
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

  const seasonById = new Map(project.seasons.map((season) => [season.id, season]));

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
  await Promise.all(
    outlines.map((outline) => {
      const season = seasonById.get(outline.id);

      return season
        ? writeGeneratedSeasonOutlineToWorkspace({
            seasonSlug: season.slug,
            title: season.title,
            outline: toStoredBilingualOutline(outline)
          })
        : Promise.resolve();
    })
  );

  revalidateComicRoutes();
  return success(
    taskType,
    "season-outlines-generated",
    `Generated ${outlines.length} season outlines.`,
    project.id,
    outlines
      .map((outline) => {
        const season = seasonById.get(outline.id);

        return season
          ? toGeneratedOutlineSnapshot({
              taskType,
              level: "SEASON",
              id: season.id,
              title: season.title,
              numberLabel: toNumberLabel("Season", season.seasonNumber),
              result: outline,
              revisionNotes
            })
          : null;
      })
      .filter((snapshot): snapshot is ComicGeneratedOutlineSnapshot => Boolean(snapshot))
  );
}

async function loadSeason(seasonId: string) {
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
        include: {
          episodes: {
            where: {
              storyType: "MAIN"
            },
            orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ chapterNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!season?.project) {
    throw new ComicOutlineTaskInputError("missing-record", "Season could not be found.");
  }

  return season;
}

async function translateSeasonOutline(taskType: ComicOutlineTaskType, seasonId: string, revisionNotes?: string) {
  const season = await loadSeason(seasonId);

  if (!hasUsableOutline(season.outline)) {
    throw new ComicOutlineTaskInputError("missing-outline", "No season outline is available to translate.");
  }

  if (hasChineseText(season.outline)) {
    throw new ComicOutlineTaskInputError("outline-already-chinese", "Season outline is already Chinese.");
  }

  const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(season.projectId);
  const result = await translateChineseComicOutlineWithAi({
    level: "SEASON",
    title: season.title,
    summary: season.summary,
    outline: season.outline,
    translationNotes: revisionNotes,
    characterNames: support.characterNames,
    characterNameLocks: support.characterNameLocks
  });

  const storedSummary = toStoredBilingualSummary(result);
  const storedOutline = toStoredBilingualOutline(result);

  await prisma.comicSeason.update({
    where: { id: season.id },
    data: {
      summary: storedSummary,
      outline: storedOutline
    }
  });
  await writeGeneratedSeasonOutlineToWorkspace({
    seasonSlug: season.slug,
    title: season.title,
    outline: storedOutline
  });

  revalidateComicRoutes({ seasonSlug: season.slug });
  return success(
    taskType,
    "season-outline-translated",
    `Translated ${season.title}.`,
    season.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "SEASON",
        id: season.id,
        title: season.title,
        numberLabel: toNumberLabel("Season", season.seasonNumber),
        result,
        revisionNotes
      })
    ]
  );
}

async function generateSeasonOutline(taskType: ComicOutlineTaskType, seasonId: string, revisionNotes?: string) {
  const season = await loadSeason(seasonId);

  if (!hasUsableOutline(season.project.storyOutline)) {
    throw new ComicOutlineTaskInputError("missing-parent-outline", "Generate the project outline first.");
  }

  const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(season.projectId);
  const result = await generateChineseComicOutlineWithAi({
    level: "SEASON",
    title: season.title,
    numberLabel: toNumberLabel("Season", season.seasonNumber),
    existingSummary: season.summary,
    existingOutline: season.outline,
    revisionNotes,
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

  const storedSummary = toStoredBilingualSummary(result);
  const storedOutline = toStoredBilingualOutline(result);

  await prisma.comicSeason.update({
    where: { id: season.id },
    data: {
      summary: storedSummary,
      outline: storedOutline
    }
  });
  await writeGeneratedSeasonOutlineToWorkspace({
    seasonSlug: season.slug,
    title: season.title,
    outline: storedOutline
  });

  revalidateComicRoutes({ seasonSlug: season.slug });
  return success(
    taskType,
    "season-outline-generated",
    `Generated outline for ${season.title}.`,
    season.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "SEASON",
        id: season.id,
        title: season.title,
        numberLabel: toNumberLabel("Season", season.seasonNumber),
        result,
        revisionNotes
      })
    ]
  );
}

async function generateChapterOutlines(taskType: ComicOutlineTaskType, seasonId: string, revisionNotes?: string) {
  const season = await loadSeason(seasonId);

  if (!hasUsableOutline(season.outline)) {
    throw new ComicOutlineTaskInputError("missing-parent-outline", "Generate the season outline first.");
  }

  if (season.chapters.length === 0) {
    throw new ComicOutlineTaskInputError("missing-children", "No chapters are available.");
  }

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
    revisionNotes,
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

  const chapterById = new Map(season.chapters.map((chapter) => [chapter.id, chapter]));

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
  await Promise.all(
    outlines.map((outline) => {
      const chapter = chapterById.get(outline.id);

      return chapter
        ? writeGeneratedChapterOutlineToWorkspace({
            seasonSlug: season.slug,
            chapterSlug: chapter.slug,
            title: chapter.title,
            outline: toStoredBilingualOutline(outline)
          })
        : Promise.resolve();
    })
  );

  revalidateComicRoutes({ seasonSlug: season.slug });
  return success(
    taskType,
    "chapter-outlines-generated",
    `Generated ${outlines.length} chapter outlines.`,
    season.id,
    outlines
      .map((outline) => {
        const chapter = chapterById.get(outline.id);

        return chapter
          ? toGeneratedOutlineSnapshot({
              taskType,
              level: "CHAPTER",
              id: chapter.id,
              title: chapter.title,
              numberLabel: toNumberLabel("Chapter", chapter.chapterNumber),
              result: outline,
              revisionNotes
            })
          : null;
      })
      .filter((snapshot): snapshot is ComicGeneratedOutlineSnapshot => Boolean(snapshot))
  );
}

async function loadChapter(chapterId: string) {
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
        where: {
          storyType: "MAIN"
        },
        orderBy: [{ episodeNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!chapter?.season.project) {
    throw new ComicOutlineTaskInputError("missing-record", "Chapter could not be found.");
  }

  return chapter;
}

async function translateChapterOutline(taskType: ComicOutlineTaskType, chapterId: string, revisionNotes?: string) {
  const chapter = await loadChapter(chapterId);

  if (!hasUsableOutline(chapter.outline)) {
    throw new ComicOutlineTaskInputError("missing-outline", "No chapter outline is available to translate.");
  }

  if (hasChineseText(chapter.outline)) {
    throw new ComicOutlineTaskInputError("outline-already-chinese", "Chapter outline is already Chinese.");
  }

  const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(chapter.season.projectId);
  const result = await translateChineseComicOutlineWithAi({
    level: "CHAPTER",
    title: chapter.title,
    summary: chapter.summary,
    outline: chapter.outline,
    translationNotes: revisionNotes,
    characterNames: support.characterNames,
    characterNameLocks: support.characterNameLocks
  });

  const storedSummary = toStoredBilingualSummary(result);
  const storedOutline = toStoredBilingualOutline(result);

  await prisma.comicChapter.update({
    where: { id: chapter.id },
    data: {
      summary: storedSummary,
      outline: storedOutline
    }
  });
  await writeGeneratedChapterOutlineToWorkspace({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug,
    title: chapter.title,
    outline: storedOutline
  });

  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug
  });
  return success(
    taskType,
    "chapter-outline-translated",
    `Translated ${chapter.title}.`,
    chapter.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "CHAPTER",
        id: chapter.id,
        title: chapter.title,
        numberLabel: toNumberLabel("Chapter", chapter.chapterNumber),
        result,
        revisionNotes
      })
    ]
  );
}

async function generateChapterOutline(taskType: ComicOutlineTaskType, chapterId: string, revisionNotes?: string) {
  const chapter = await loadChapter(chapterId);

  if (!hasUsableOutline(chapter.season.outline)) {
    throw new ComicOutlineTaskInputError("missing-parent-outline", "Generate the season outline first.");
  }

  const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(chapter.season.projectId);
  const result = await generateChineseComicOutlineWithAi({
    level: "CHAPTER",
    title: chapter.title,
    numberLabel: toNumberLabel("Chapter", chapter.chapterNumber),
    existingSummary: chapter.summary,
    existingOutline: chapter.outline,
    revisionNotes,
    parentChain: [getProjectChain(chapter.season.project), getSeasonChain(chapter.season)],
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

  const storedSummary = toStoredBilingualSummary(result);
  const storedOutline = toStoredBilingualOutline(result);

  await prisma.comicChapter.update({
    where: { id: chapter.id },
    data: {
      summary: storedSummary,
      outline: storedOutline
    }
  });
  await writeGeneratedChapterOutlineToWorkspace({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug,
    title: chapter.title,
    outline: storedOutline
  });

  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug
  });
  return success(
    taskType,
    "chapter-outline-generated",
    `Generated outline for ${chapter.title}.`,
    chapter.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "CHAPTER",
        id: chapter.id,
        title: chapter.title,
        numberLabel: toNumberLabel("Chapter", chapter.chapterNumber),
        result,
        revisionNotes
      })
    ]
  );
}

async function generateEpisodeOutlines(taskType: ComicOutlineTaskType, chapterId: string, revisionNotes?: string) {
  const chapter = await loadChapter(chapterId);

  if (!hasUsableOutline(chapter.outline)) {
    throw new ComicOutlineTaskInputError("missing-parent-outline", "Generate the chapter outline first.");
  }

  if (chapter.episodes.length === 0) {
    throw new ComicOutlineTaskInputError("missing-children", "No episodes are available.");
  }

  const { generateChineseComicChildOutlinesWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(chapter.season.projectId);
  const outlines = await generateChineseComicChildOutlinesWithAi({
    childLevel: "EPISODE",
    parent: getChapterChain(chapter),
    parentChain: [getProjectChain(chapter.season.project), getSeasonChain(chapter.season)],
    children: chapter.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      numberLabel: toNumberLabel("Episode", episode.episodeNumber),
      existingSummary: episode.summary,
      existingOutline: episode.outline
    })),
    revisionNotes,
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

  const episodeById = new Map(chapter.episodes.map((episode) => [episode.id, episode]));

  await prisma.$transaction(
    outlines.map((outline) => {
      const episode = episodeById.get(outline.id);
      const nextTitle = episode
        ? normalizeGeneratedOutlineTitle({
            generatedTitle: outline.title,
            fallbackTitle: episode.title,
            numberLabel: toNumberLabel("Episode", episode.episodeNumber)
          })
        : outline.title || "";

      return prisma.comicEpisode.update({
        where: { id: outline.id },
        data: {
          title: nextTitle,
          summary: toStoredBilingualSummary(outline),
          outline: toStoredBilingualOutline(outline)
        }
      });
    })
  );
  await Promise.all(
    outlines.map((outline) => {
      const episode = episodeById.get(outline.id);

      if (!episode) {
        return Promise.resolve();
      }

      const nextTitle = normalizeGeneratedOutlineTitle({
        generatedTitle: outline.title,
        fallbackTitle: episode.title,
        numberLabel: toNumberLabel("Episode", episode.episodeNumber)
      });

      return writeGeneratedEpisodeOutlineToWorkspace({
        seasonSlug: chapter.season.slug,
        chapterSlug: chapter.slug,
        episodeSlug: episode.slug,
        title: `Episode ${episode.episodeNumber} - ${nextTitle}`,
        outline: toStoredBilingualOutline(outline)
      });
    })
  );

  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug
  });
  return success(
    taskType,
    "episode-outlines-generated",
    `Generated ${outlines.length} episode outlines.`,
    chapter.id,
    outlines
      .map((outline) => {
        const episode = episodeById.get(outline.id);

        if (!episode) {
          return null;
        }

        const nextTitle = normalizeGeneratedOutlineTitle({
          generatedTitle: outline.title,
          fallbackTitle: episode.title,
          numberLabel: toNumberLabel("Episode", episode.episodeNumber)
        });

        return toGeneratedOutlineSnapshot({
          taskType,
          level: "EPISODE",
          id: episode.id,
          title: nextTitle,
          numberLabel: toNumberLabel("Episode", episode.episodeNumber),
          result: outline,
          revisionNotes
        });
      })
      .filter((snapshot): snapshot is ComicGeneratedOutlineSnapshot => Boolean(snapshot))
  );
}

async function loadEpisode(episodeId: string) {
  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
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

  if (!episode?.chapter.season.project) {
    throw new ComicOutlineTaskInputError("missing-record", "Episode could not be found.");
  }

  return episode;
}

async function translateEpisodeOutline(taskType: ComicOutlineTaskType, episodeId: string, revisionNotes?: string) {
  const episode = await loadEpisode(episodeId);

  if (!hasUsableOutline(episode.outline)) {
    throw new ComicOutlineTaskInputError("missing-outline", "No episode outline is available to translate.");
  }

  if (hasChineseText(episode.outline)) {
    throw new ComicOutlineTaskInputError("outline-already-chinese", "Episode outline is already Chinese.");
  }

  const { translateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(episode.chapter.season.projectId);
  const result = await translateChineseComicOutlineWithAi({
    level: "EPISODE",
    title: episode.title,
    summary: episode.summary,
    outline: episode.outline,
    translationNotes: revisionNotes,
    characterNames: support.characterNames,
    characterNameLocks: support.characterNameLocks
  });

  const storedSummary = toStoredBilingualSummary(result);
  const storedOutline = toStoredBilingualOutline(result);

  await prisma.comicEpisode.update({
    where: { id: episode.id },
    data: {
      summary: storedSummary,
      outline: storedOutline
    }
  });
  await writeGeneratedEpisodeOutlineToWorkspace({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug,
    title: `Episode ${episode.episodeNumber} - ${episode.title}`,
    outline: storedOutline
  });

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  return success(
    taskType,
    "episode-outline-translated",
    `Translated ${episode.title}.`,
    episode.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "EPISODE",
        id: episode.id,
        title: episode.title,
        numberLabel: toNumberLabel("Episode", episode.episodeNumber),
        result,
        revisionNotes
      })
    ]
  );
}

async function generateEpisodeOutline(taskType: ComicOutlineTaskType, episodeId: string, revisionNotes?: string) {
  const episode = await loadEpisode(episodeId);

  if (!hasUsableOutline(episode.chapter.outline)) {
    throw new ComicOutlineTaskInputError("missing-parent-outline", "Generate the chapter outline first.");
  }

  const { generateChineseComicOutlineWithAi } = await import("@/lib/openai-comic");
  const support = await getComicOutlineSupport(episode.chapter.season.projectId);
  const result = await generateChineseComicOutlineWithAi({
    level: "EPISODE",
    title: episode.title,
    numberLabel: toNumberLabel("Episode", episode.episodeNumber),
    existingSummary: episode.summary,
    existingOutline: episode.outline,
    revisionNotes,
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

  const nextTitle = normalizeGeneratedOutlineTitle({
    generatedTitle: result.title,
    fallbackTitle: episode.title,
    numberLabel: toNumberLabel("Episode", episode.episodeNumber)
  });
  const storedSummary = toStoredBilingualSummary(result);
  const storedOutline = toStoredBilingualOutline(result);

  await prisma.comicEpisode.update({
    where: { id: episode.id },
    data: {
      title: nextTitle,
      summary: storedSummary,
      outline: storedOutline
    }
  });
  await writeGeneratedEpisodeOutlineToWorkspace({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug,
    title: `Episode ${episode.episodeNumber} - ${nextTitle}`,
    outline: storedOutline
  });

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  return success(
    taskType,
    "episode-outline-generated",
    `Generated outline for ${nextTitle}.`,
    episode.id,
    [
      toGeneratedOutlineSnapshot({
        taskType,
        level: "EPISODE",
        id: episode.id,
        title: nextTitle,
        numberLabel: toNumberLabel("Episode", episode.episodeNumber),
        result,
        revisionNotes
      })
    ]
  );
}

export async function runComicOutlineTask(input: {
  taskType: ComicOutlineTaskType;
  targetId?: string;
  revisionNotes?: string;
}): Promise<ComicOutlineTaskResult> {
  const taskType = input.taskType;
  const targetId = input.targetId || "";
  const revisionNotes = input.revisionNotes?.trim() || "";

  try {
    switch (taskType) {
      case "project-generate":
        return await generateProjectOutline(taskType, targetId, revisionNotes);
      case "project-translate":
        return await translateProjectOutline(taskType, targetId, revisionNotes);
      case "seasons-generate":
        return await generateSeasonOutlines(taskType, targetId, revisionNotes);
      case "season-generate":
        return await generateSeasonOutline(taskType, targetId, revisionNotes);
      case "season-translate":
        return await translateSeasonOutline(taskType, targetId, revisionNotes);
      case "chapters-generate":
        return await generateChapterOutlines(taskType, targetId, revisionNotes);
      case "chapter-generate":
        return await generateChapterOutline(taskType, targetId, revisionNotes);
      case "chapter-translate":
        return await translateChapterOutline(taskType, targetId, revisionNotes);
      case "episodes-generate":
        return await generateEpisodeOutlines(taskType, targetId, revisionNotes);
      case "episode-generate":
        return await generateEpisodeOutline(taskType, targetId, revisionNotes);
      case "episode-translate":
        return await translateEpisodeOutline(taskType, targetId, revisionNotes);
      default:
        throw new ComicOutlineTaskInputError("missing-record", "Unsupported outline task.");
    }
  } catch (error) {
    if (error instanceof ComicOutlineTaskInputError) {
      throw error;
    }

    return {
      ok: false,
      status: getFailureStatus(taskType),
      taskType,
      targetId,
      message: "Comic outline task failed.",
      errorMessage: error instanceof Error ? error.message : "Unknown comic outline task error."
    };
  }
}
