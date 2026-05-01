import { buildComicRedirect, revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { prisma } from "@/lib/db";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import {
  getComicCharacterReferenceFiles,
  getComicChapterSceneReferenceState,
  getComicSceneReferenceFiles
} from "@/lib/comic-reference-manifest";

export type ComicPromptPackageGenerationStatus =
  | "prompt-generated"
  | "prompt-failed"
  | "missing-episode"
  | "missing-project";

export type ComicPagePromptRevisionStatus =
  | "page-prompt-revised"
  | "page-prompt-revision-failed"
  | "missing-episode"
  | "missing-page-prompt"
  | "missing-prompt-suggestion"
  | "missing-project";

export class ComicPromptGenerationInputError extends Error {
  status: ComicPromptPackageGenerationStatus | ComicPagePromptRevisionStatus;

  constructor(
    status: ComicPromptPackageGenerationStatus | ComicPagePromptRevisionStatus,
    message: string
  ) {
    super(message);
    this.name = "ComicPromptGenerationInputError";
    this.status = status;
  }
}

export type ComicPromptTaskResult = {
  ok: boolean;
  status: ComicPromptPackageGenerationStatus | ComicPagePromptRevisionStatus;
  episodeId: string;
  pageNumber?: number;
  message: string;
  errorMessage?: string;
};

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

export async function generateComicPromptPackageForEpisode(input: {
  episodeId: string;
}): Promise<ComicPromptTaskResult> {
  const episodeId = input.episodeId.trim();

  if (!episodeId) {
    throw new ComicPromptGenerationInputError("missing-episode", "Episode is required.");
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      chapter: {
        include: {
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
    throw new ComicPromptGenerationInputError("missing-project", "Comic project is missing.");
  }

  const [characters, scenes] = await Promise.all([
    prisma.comicCharacter.findMany({
      where: {
        projectId: episode.chapter.season.projectId,
        active: true
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    prisma.comicScene.findMany({
      where: {
        projectId: episode.chapter.season.projectId,
        active: true
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    })
  ]);

  const chapterSceneReferenceState = getComicChapterSceneReferenceState(
    episode.chapter.season.slug,
    episode.chapter.slug
  );

  const inputContext = JSON.stringify(
    {
      project: {
        title: episode.chapter.season.project.title,
        slug: episode.chapter.season.project.slug
      },
      season: {
        title: episode.chapter.season.title,
        slug: episode.chapter.season.slug
      },
      chapter: {
        title: episode.chapter.title,
        slug: episode.chapter.slug
      },
      episode: {
        title: episode.title,
        slug: episode.slug
      },
      characterCount: characters.length,
      sceneCount: scenes.length,
      chapterSceneReferenceFolder: chapterSceneReferenceState.chapterSceneReferenceFolder,
      chapterSceneReferenceCount: chapterSceneReferenceState.chapterSceneReferences.length,
      chapterSceneReferenceFiles: chapterSceneReferenceState.chapterSceneReferences.map(
        (reference) => reference.fileName
      ),
      characterReferenceFiles: characters.map((character) => ({
        slug: character.slug,
        files: getComicCharacterReferenceFiles(character.slug).map((file) => file.fileName)
      })),
      sceneReferenceFiles: scenes.map((scene) => ({
        slug: scene.slug,
        files: getComicSceneReferenceFiles(scene.slug).map((file) => file.fileName)
      }))
    },
    null,
    2
  );

  try {
    const { generateComicPromptPackageWithAi } = await import("@/lib/openai-comic");
    const result = await generateComicPromptPackageWithAi({
      project: {
        title: episode.chapter.season.project.title,
        shortDescription: episode.chapter.season.project.shortDescription,
        storyOutline: episode.chapter.season.project.storyOutline,
        worldRules: episode.chapter.season.project.worldRules,
        visualStyleGuide: episode.chapter.season.project.visualStyleGuide,
        workflowNotes: episode.chapter.season.project.workflowNotes
      },
      season: {
        title: episode.chapter.season.title,
        summary: episode.chapter.season.summary,
        outline: episode.chapter.season.outline
      },
      chapter: {
        title: episode.chapter.title,
        summary: episode.chapter.summary,
        outline: episode.chapter.outline
      },
      episode: {
        title: episode.title,
        summary: episode.summary,
        outline: episode.outline
      },
      characters: characters.map((character) => ({
        name: character.name,
        slug: character.slug,
        role: character.role,
        appearance: character.appearance,
        personality: character.personality,
        speechGuide: character.speechGuide,
        referenceFolder: character.referenceFolder,
        referenceNotes: character.referenceNotes,
        referenceFiles: getComicCharacterReferenceFiles(character.slug)
      })),
      scenes: scenes.map((scene) => ({
        name: scene.name,
        slug: scene.slug,
        summary: scene.summary,
        visualNotes: scene.visualNotes,
        moodNotes: scene.moodNotes,
        referenceFolder: scene.referenceFolder,
        referenceNotes: scene.referenceNotes,
        referenceFiles: getComicSceneReferenceFiles(scene.slug)
      })),
      chapterSceneReferences: chapterSceneReferenceState.chapterSceneReferences
    });

    await prisma.$transaction([
      prisma.comicEpisode.update({
        where: { id: episodeId },
        data: {
          script: result.episodeScript,
          panelPlan: result.pagePlan,
          promptPack: JSON.stringify(
            {
              episodeLogline: result.episodeLogline,
              episodeSynopsis: result.episodeSynopsis,
              pages: result.pages
            },
            null,
            2
          ),
          requiredReferences: JSON.stringify(
            {
              globalGptImage2Notes: result.globalGptImage2Notes,
              pages: result.pages.map((page) => ({
                pageNumber: page.pageNumber,
                panelCount: page.panelCount,
                referenceNotesCopyText: page.referenceNotesCopyText,
                requiredUploads: page.requiredUploads
              }))
            },
            null,
            2
          )
        }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "EPISODE_PROMPT_PACKAGE",
          model: getComicModel(),
          imageModel: getComicImageModel(),
          status: "READY",
          inputContext,
          outputSummary: result.episodeLogline,
          promptPack: JSON.stringify(result.pages, null, 2),
          referenceChecklist: JSON.stringify(
            {
              globalGptImage2Notes: result.globalGptImage2Notes,
              pages: result.pages.map((page) => ({
                pageNumber: page.pageNumber,
                panelCount: page.panelCount,
                referenceNotesCopyText: page.referenceNotesCopyText,
                requiredUploads: page.requiredUploads
              }))
            },
            null,
            2
          )
        }
      })
    ]);

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: true,
      status: "prompt-generated",
      episodeId,
      message: `Generated prompt package for ${episode.title}.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown comic prompt generation error.";

    await prisma.comicPromptRun.create({
      data: {
        episodeId,
        promptType: "EPISODE_PROMPT_PACKAGE",
        model: getComicModel(),
        imageModel: getComicImageModel(),
        status: "FAILED",
        inputContext,
        outputSummary: "Prompt generation failed.",
        errorMessage
      }
    });

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: false,
      status: "prompt-failed",
      episodeId,
      message: `Prompt generation failed for ${episode.title}.`,
      errorMessage
    };
  }
}

export async function reviseComicPagePromptForEpisode(input: {
  episodeId: string;
  pageNumber: number;
  promptSuggestion: string;
}): Promise<ComicPromptTaskResult> {
  const episodeId = input.episodeId.trim();
  const pageNumber = input.pageNumber;
  const promptSuggestion = input.promptSuggestion.trim();

  if (!episodeId) {
    throw new ComicPromptGenerationInputError("missing-episode", "Episode is required.");
  }

  if (!pageNumber) {
    throw new ComicPromptGenerationInputError("missing-page-prompt", "Page number is required.");
  }

  if (!promptSuggestion) {
    throw new ComicPromptGenerationInputError(
      "missing-prompt-suggestion",
      "Prompt suggestion is required."
    );
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      chapter: {
        include: {
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
    throw new ComicPromptGenerationInputError("missing-project", "Comic project is missing.");
  }

  const parsedPromptOutput = parseComicPromptOutput(episode.promptPack, episode.requiredReferences);
  const page = parsedPromptOutput?.pages.find((candidate) => candidate.pageNumber === pageNumber);

  if (!parsedPromptOutput || !page) {
    throw new ComicPromptGenerationInputError(
      "missing-page-prompt",
      "Generate a page-by-page prompt package before revising a page prompt."
    );
  }

  const inputContext = JSON.stringify(
    {
      project: episode.chapter.season.project.title,
      season: episode.chapter.season.title,
      chapter: episode.chapter.title,
      episode: episode.title,
      pageNumber,
      promptSuggestion,
      currentPage: {
        pagePurpose: page.pagePurpose,
        panelCount: page.panelCount,
        promptPackCopyText: page.promptPackCopyText,
        referenceNotesCopyText: page.referenceNotesCopyText,
        panels: page.panels
      }
    },
    null,
    2
  );

  try {
    const { reviseComicPagePromptWithAi } = await import("@/lib/openai-comic");
    const revisedPage = await reviseComicPagePromptWithAi({
      episodeTitle: episode.title,
      episodeSummary: episode.summary,
      pageNumber: page.pageNumber,
      panelCount: page.panelCount,
      pagePurpose: page.pagePurpose,
      promptPackCopyText: page.promptPackCopyText,
      referenceNotesCopyText: page.referenceNotesCopyText,
      globalGptImage2Notes: parsedPromptOutput.globalGptImage2Notes,
      panels: page.panels,
      promptSuggestion
    });

    const nextPages = parsedPromptOutput.pages.map((candidate) =>
      candidate.pageNumber === pageNumber
        ? {
            ...candidate,
            pageNumber: revisedPage.pageNumber,
            panelCount: revisedPage.panelCount,
            pagePurpose: revisedPage.pagePurpose,
            promptPackCopyText: revisedPage.promptPackCopyText,
            referenceNotesCopyText: revisedPage.referenceNotesCopyText,
            panels: revisedPage.panels
          }
        : candidate
    );

    await prisma.$transaction([
      prisma.comicEpisode.update({
        where: { id: episodeId },
        data: {
          promptPack: JSON.stringify(
            {
              episodeLogline: parsedPromptOutput.episodeLogline,
              episodeSynopsis: parsedPromptOutput.episodeSynopsis,
              pages: nextPages.map((nextPage) => ({
                pageNumber: nextPage.pageNumber,
                panelCount: nextPage.panelCount,
                pagePurpose: nextPage.pagePurpose,
                promptPackCopyText: nextPage.promptPackCopyText,
                panels: nextPage.panels,
                referenceNotesCopyText: nextPage.referenceNotesCopyText,
                requiredUploads: nextPage.requiredUploads
              }))
            },
            null,
            2
          ),
          requiredReferences: JSON.stringify(
            {
              globalGptImage2Notes: parsedPromptOutput.globalGptImage2Notes,
              pages: nextPages.map((nextPage) => ({
                pageNumber: nextPage.pageNumber,
                panelCount: nextPage.panelCount,
                referenceNotesCopyText: nextPage.referenceNotesCopyText,
                requiredUploads: nextPage.requiredUploads
              }))
            },
            null,
            2
          )
        }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "PAGE_PROMPT_REVISION",
          model: getComicModel(),
          imageModel: getComicImageModel(),
          status: "READY",
          inputContext,
          outputSummary: `Revised ${episode.title} page ${pageNumber} prompt from admin suggestion.`,
          promptPack: revisedPage.promptPackCopyText,
          referenceChecklist: revisedPage.referenceNotesCopyText
        }
      })
    ]);

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: true,
      status: "page-prompt-revised",
      episodeId,
      pageNumber,
      message: `Revised ${episode.title} page ${pageNumber} prompt.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown comic page prompt revision error.";

    await prisma.comicPromptRun.create({
      data: {
        episodeId,
        promptType: "PAGE_PROMPT_REVISION",
        model: getComicModel(),
        imageModel: getComicImageModel(),
        status: "FAILED",
        inputContext,
        outputSummary: `Page ${pageNumber} prompt revision failed.`,
        promptPack: page.promptPackCopyText,
        referenceChecklist: page.referenceNotesCopyText,
        errorMessage
      }
    });

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: false,
      status: "page-prompt-revision-failed",
      episodeId,
      pageNumber,
      message: `Page ${pageNumber} prompt revision failed.`,
      errorMessage
    };
  }
}

export function buildComicPromptTaskRedirect(basePath: string, status: string) {
  return buildComicRedirect(basePath, status);
}
