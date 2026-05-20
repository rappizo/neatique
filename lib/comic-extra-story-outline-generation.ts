import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import {
  formatComicBilingualOutline,
  formatComicBilingualSummary
} from "@/lib/comic-bilingual-outline";
import { toComicCharacterChineseNameLocks } from "@/lib/comic-character-chinese-names";
import {
  formatComicProductLockPromptContext,
  loadComicProductLockPromptContexts
} from "@/lib/comic-product-locks";
import { prisma } from "@/lib/db";

const EXTRA_STORY_TYPE = "EXTRA";

type ExtraStoryOutlineStatus =
  | "extra-story-outline-generated"
  | "missing-record"
  | "outline-failed";

type ExtraStoryOutlineTaskResult = {
  ok: boolean;
  status: ExtraStoryOutlineStatus;
  taskType: "extra-story-generate";
  targetId?: string;
  message: string;
  errorMessage?: string;
};

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

function formatExtraStoryRevisionNotes(input: {
  userRequest: string;
  revisionNotes?: string;
  parentEpisode: { episodeNumber: number; title: string; summary: string; outline: string };
  productLockSummary: string;
}) {
  return [
    "Generate a bilingual outline for a Neatique Extra Story.",
    "This extra story is product-led. Its main job is to introduce product functions, use cases, texture/feel cues, audience fit, and practical benefit points through a light comic scene.",
    "Tone: soft promotional and useful, like a gentle brand mini-story. It should be more persuasive and product-clear than a normal plot episode, but still avoid hard-sell ad copy, medical claims, fake guarantees, or dense packaging text.",
    "Every page should leave the reader understanding one product point: what the product is for, how characters would use or evaluate it, what sensory/skin-log detail matters, or why the feature is relevant.",
    "Keep the story simple enough that the product function is not hidden under mystery, lore, or abstract philosophy.",
    `User request:\n${input.userRequest}`,
    input.revisionNotes ? `Revision notes from producer:\n${input.revisionNotes}` : null,
    "",
    `Publish placement: after Episode ${input.parentEpisode.episodeNumber}: ${input.parentEpisode.title}`,
    `Parent episode summary:\n${input.parentEpisode.summary}`,
    `Parent episode outline:\n${input.parentEpisode.outline}`,
    "",
    "Product locks available for this extra story. Use the Usage lock as the product-function memo:",
    input.productLockSummary,
    "",
    "If a product is mentioned, keep its product design locked: simple bottle, front label only shows the big product code, no small packaging text.",
    "The output must still be a bilingual extra-story outline plus summary that can later generate a cover plus page prompts."
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateComicExtraStoryOutlineForEpisode(input: {
  episodeId: string;
  userRequest?: string | null;
  revisionNotes?: string | null;
}): Promise<ExtraStoryOutlineTaskResult> {
  const episodeId = input.episodeId.trim();

  if (!episodeId) {
    return {
      ok: false,
      status: "missing-record",
      taskType: "extra-story-generate",
      message: "Extra story episode is required."
    };
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      extraStoryParentEpisode: {
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
      },
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode || episode.storyType !== EXTRA_STORY_TYPE) {
    return {
      ok: false,
      status: "missing-record",
      taskType: "extra-story-generate",
      targetId: episodeId,
      message: "Extra story episode could not be found."
    };
  }

  const parentEpisode = episode.extraStoryParentEpisode;

  if (!parentEpisode?.chapter.season.project) {
    return {
      ok: false,
      status: "missing-record",
      taskType: "extra-story-generate",
      targetId: episode.id,
      message: "Extra story parent episode could not be found."
    };
  }

  const revisionNotes = input.revisionNotes?.trim() || "";
  const userRequest =
    input.userRequest?.trim() || episode.outline.trim() || episode.summary.trim() || episode.title;

  try {
    const [{ generateChineseComicOutlineWithAi }, support, productLocks] = await Promise.all([
      import("@/lib/openai-comic"),
      getComicOutlineSupport(parentEpisode.chapter.season.projectId),
      loadComicProductLockPromptContexts(userRequest)
    ]);
    const result = await generateChineseComicOutlineWithAi({
      level: "EPISODE",
      title: episode.title,
      numberLabel: "Extra Story",
      existingSummary: episode.summary,
      existingOutline: episode.outline,
      revisionNotes: formatExtraStoryRevisionNotes({
        userRequest,
        revisionNotes,
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

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: true,
      status: "extra-story-outline-generated",
      taskType: "extra-story-generate",
      targetId: episode.id,
      message: `Generated extra-story outline for ${episode.title}.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown extra-story outline generation error.";

    return {
      ok: false,
      status: "outline-failed",
      taskType: "extra-story-generate",
      targetId: episode.id,
      message: `Extra-story outline generation failed for ${episode.title}.`,
      errorMessage
    };
  }
}
