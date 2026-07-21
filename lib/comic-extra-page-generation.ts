import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { isNextRedirectError } from "@/lib/comic-action-errors";
import {
  getComicExtraPromptPage,
  upsertComicExtraPromptPage,
  upsertComicExtraReferencePage
} from "@/lib/comic-extra-pages";
import { buildComicMediaFallbackUrl, storeComicImage } from "@/lib/comic-image-storage";
import { COMIC_EXTRA_PAGE_ASSET_TYPE, formatComicPageLabel } from "@/lib/comic-pages";
import { createComicTaskTimer, type ComicTaskTiming } from "@/lib/comic-task-timing";
import { prisma } from "@/lib/db";
import { resolveComicGenerationReferenceSelection } from "@/lib/comic-generation-reference-selection";

export type ComicExtraPageTaskStatus =
  | "extra-page-image-generated"
  | "extra-page-image-failed"
  | "extra-page-prompt-revised"
  | "extra-page-prompt-revision-failed"
  | "missing-episode"
  | "missing-extra-page-prompt"
  | "missing-project"
  | "missing-prompt-suggestion";

export class ComicExtraPageInputError extends Error {
  status: ComicExtraPageTaskStatus;

  constructor(status: ComicExtraPageTaskStatus, message: string) {
    super(message);
    this.name = "ComicExtraPageInputError";
    this.status = status;
  }
}

type ComicExtraPageTaskResult = {
  ok: boolean;
  status: ComicExtraPageTaskStatus;
  episodeId: string;
  extraPageKey: string;
  pageNumber: number;
  assetId?: string;
  imageUrl?: string;
  referenceImageCount?: number;
  timing?: ComicTaskTiming;
  message: string;
  errorMessage?: string;
};

function getComicModel() {
  return process.env.AI_TEXT_MODEL || "gpt-5.4-mini";
}

function getComicImageModel() {
  return process.env.AI_IMAGE_MODEL || "gemini-3.1-flash-image";
}

function getExtraPageImagePageNumber(extraPage: { imagePageNumber?: number; pageNumber: number }) {
  return Math.max(1, extraPage.imagePageNumber || extraPage.pageNumber || 1);
}

function getExtraPageReferenceDetectionText(extraPage: NonNullable<ReturnType<typeof getComicExtraPromptPage>>) {
  return [
    extraPage.title,
    extraPage.pagePurpose,
    extraPage.panels
      .map((panel) =>
        [
          panel.panelTitle,
          panel.storyBeat,
          panel.promptText,
          panel.dialogueLines?.map((line) => `${line.speaker}: ${line.text}`).join("\n")
        ]
          .filter(Boolean)
          .join("\n")
      )
      .join("\n\n"),
    extraPage.requiredUploads
      .map((upload) => [upload.label, upload.slug, upload.contentSummary].join(" "))
      .join("\n")
  ].join("\n\n");
}

async function getEpisodeWithProject(episodeId: string) {
  return prisma.comicEpisode.findUnique({
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
}

export async function generateComicExtraPageImageForEpisode(input: {
  episodeId: string;
  extraPageKey: string;
  attempt?: number;
  referenceImages?: unknown;
}): Promise<ComicExtraPageTaskResult> {
  const episodeId = input.episodeId.trim();
  const extraPageKey = input.extraPageKey.trim();
  const attempt = Math.max(input.attempt || 1, 1);
  const timer = createComicTaskTimer();

  if (!episodeId) {
    throw new ComicExtraPageInputError("missing-episode", "Episode is required.");
  }

  if (!extraPageKey) {
    throw new ComicExtraPageInputError(
      "missing-extra-page-prompt",
      "Extra page prompt is required."
    );
  }

  const episode = await timer.time("loadEpisode", () => getEpisodeWithProject(episodeId));

  if (!episode?.chapter.season.project) {
    throw new ComicExtraPageInputError("missing-project", "Comic project is missing.");
  }

  const extraPage = getComicExtraPromptPage(episode.promptPack, extraPageKey);

  if (!extraPage) {
    throw new ComicExtraPageInputError(
      "missing-extra-page-prompt",
      "Create an extra page prompt before generating this insert page."
    );
  }

  const { buildComicPageImagePrompt, generateComicPageImageWithAi } = await import("@/lib/openai-comic");
  const referenceDetectionText = getExtraPageReferenceDetectionText(extraPage);
  const referenceSelection = await timer.time("loadReferenceContexts", () =>
    resolveComicGenerationReferenceSelection({
      requiredUploads: extraPage.requiredUploads,
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      referenceDetectionText,
      productDetectionText: [
        extraPage.title,
        extraPage.pagePurpose,
        extraPage.promptPackCopyText,
        extraPage.referenceNotesCopyText,
        referenceDetectionText
      ].join("\n"),
      referenceImageOverrides: input.referenceImages
    })
  );
  const imagePageNumber = getExtraPageImagePageNumber(extraPage);
  const imageInput = {
    projectTitle: episode.chapter.season.project.title,
    seasonTitle: episode.chapter.season.title,
    chapterTitle: episode.chapter.title,
    episodeTitle: episode.title,
    episodeSummary: episode.summary,
    pageNumber: imagePageNumber,
    pageLabel: `Reader insert after ${formatComicPageLabel(extraPage.anchorPageNumber)}`,
    panelCount: extraPage.panelCount,
    pagePurpose: extraPage.pagePurpose,
    promptPackCopyText: extraPage.promptPackCopyText,
    referenceNotesCopyText: extraPage.referenceNotesCopyText || "",
    globalGptImage2Notes: null,
    panels: extraPage.panels.map((panel) => ({
      pageNumber: imagePageNumber,
      ...panel,
      promptText: panel.promptText || panel.storyBeat,
      dialogueLines: panel.dialogueLines || []
    })),
    requiredUploads: extraPage.requiredUploads,
    referenceImages: referenceSelection.referenceImages,
    characterLocks: referenceSelection.characterLocks,
    productLocks: referenceSelection.productLocks,
    generationAttempt: attempt
  };
  const inputPrompt = timer.timeSync("buildPrompt", () => buildComicPageImagePrompt(imageInput));
  const inputContext = JSON.stringify(
    {
      project: episode.chapter.season.project.title,
      season: episode.chapter.season.title,
      chapter: episode.chapter.title,
      episode: episode.title,
      extraPageKey,
      extraPageTitle: extraPage.title,
      anchorPageNumber: extraPage.anchorPageNumber,
      panelCount: extraPage.panelCount,
      pagePurpose: extraPage.pagePurpose,
      referenceSelectionMode: referenceSelection.mode,
      referenceImages: imageInput.referenceImages.map((reference) => ({
        label: reference.label,
        fileName: reference.fileName,
        relativePath: reference.relativePath,
        source: reference.source,
        bucket: reference.bucket
      })),
      productLocks: imageInput.productLocks.map((productLock) => ({
        slug: productLock.slug,
        displayName: productLock.displayName,
        shortCode: productLock.shortCode,
        hasReferenceImage: Boolean(productLock.imageUrl)
      })),
      prompt: inputPrompt
    },
    null,
    2
  );

  try {
    const imageAsset = await timer.time("openAiImage", () =>
      generateComicPageImageWithAi(imageInput)
    );
    const storedImage = await timer.time("storeImage", () =>
      storeComicImage({
        base64Data: imageAsset.base64Data,
        mimeType: imageAsset.mimeType,
        category: "generated-pages",
        targetId: episodeId,
        fileName: `${extraPage.extraPageKey}-${Date.now()}`
      })
    );
    const createdAsset = await timer.time("createAsset", () =>
      prisma.comicEpisodeAsset.create({
        data: {
          episodeId,
          assetType: COMIC_EXTRA_PAGE_ASSET_TYPE,
          title: `${episode.title} - ${extraPage.title}`,
          imageUrl: storedImage.imageUrl,
          imageData: storedImage.imageData,
          imageMimeType: storedImage.imageMimeType,
          imageStorageKey: storedImage.imageStorageKey,
          imageByteSize: storedImage.imageByteSize,
          imageSha256: storedImage.imageSha256,
          altText: `${episode.title} ${extraPage.title} comic insert`,
          caption: extraPage.pagePurpose,
          sortOrder: extraPage.anchorPageNumber,
          published: false
        },
        select: {
          id: true
        }
      })
    );
    const imageUrl = storedImage.imageData
      ? buildComicMediaFallbackUrl(createdAsset.id)
      : storedImage.imageUrl;

    await timer.time("writePromptRun", () =>
      prisma.$transaction([
        prisma.comicEpisodeAsset.update({
          where: { id: createdAsset.id },
          data: { imageUrl }
        }),
        prisma.comicPromptRun.create({
          data: {
            episodeId,
            promptType: "EXTRA_PAGE_IMAGE_GENERATION",
            model: getComicModel(),
            imageModel: getComicImageModel(),
            status: "READY",
            inputContext,
            outputSummary: `Generated ${episode.title} ${extraPage.title} insert with ${imageInput.referenceImages.length} direct reference image${imageInput.referenceImages.length === 1 ? "" : "s"}.`,
            promptPack: extraPage.promptPackCopyText,
            referenceChecklist: extraPage.referenceNotesCopyText || ""
          }
        })
      ])
    );

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: true,
      status: "extra-page-image-generated",
      episodeId,
      extraPageKey,
      pageNumber: extraPage.anchorPageNumber,
      assetId: createdAsset.id,
      imageUrl,
      referenceImageCount: imageInput.referenceImages.length,
      timing: timer.snapshot(),
      message: `Generated ${episode.title} ${extraPage.title} insert.`
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown comic extra page generation error.";

    await timer.time("writeFailedPromptRun", () =>
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "EXTRA_PAGE_IMAGE_GENERATION",
          model: getComicModel(),
          imageModel: getComicImageModel(),
          status: "FAILED",
          inputContext,
          outputSummary: `${extraPage.title} insert image generation failed.`,
          promptPack: extraPage.promptPackCopyText,
          referenceChecklist: extraPage.referenceNotesCopyText || "",
          errorMessage
        }
      })
    );

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });

    return {
      ok: false,
      status: "extra-page-image-failed",
      episodeId,
      extraPageKey,
      pageNumber: extraPage.anchorPageNumber,
      referenceImageCount: imageInput.referenceImages.length,
      timing: timer.snapshot(),
      message: `${extraPage.title} insert image generation failed.`,
      errorMessage
    };
  }
}

export async function reviseComicExtraPagePromptForEpisode(input: {
  episodeId: string;
  extraPageKey: string;
  promptSuggestion: string;
}): Promise<ComicExtraPageTaskResult> {
  const episodeId = input.episodeId.trim();
  const extraPageKey = input.extraPageKey.trim();
  const promptSuggestion = input.promptSuggestion.trim();

  if (!episodeId) {
    throw new ComicExtraPageInputError("missing-episode", "Episode is required.");
  }

  if (!extraPageKey) {
    throw new ComicExtraPageInputError(
      "missing-extra-page-prompt",
      "Extra page prompt is required."
    );
  }

  if (!promptSuggestion) {
    throw new ComicExtraPageInputError(
      "missing-prompt-suggestion",
      "Prompt suggestion is required."
    );
  }

  const episode = await getEpisodeWithProject(episodeId);

  if (!episode?.chapter.season.project) {
    throw new ComicExtraPageInputError("missing-project", "Comic project is missing.");
  }

  const extraPage = getComicExtraPromptPage(episode.promptPack, extraPageKey);

  if (!extraPage) {
    throw new ComicExtraPageInputError(
      "missing-extra-page-prompt",
      "Create an extra page prompt before revising this insert page."
    );
  }

  const imagePageNumber = getExtraPageImagePageNumber(extraPage);
  const inputContext = JSON.stringify(
    {
      project: episode.chapter.season.project.title,
      season: episode.chapter.season.title,
      chapter: episode.chapter.title,
      episode: episode.title,
      extraPageKey,
      extraPageTitle: extraPage.title,
      anchorPageNumber: extraPage.anchorPageNumber,
      promptSuggestion,
      currentPage: extraPage
    },
    null,
    2
  );

  try {
    const { reviseComicPagePromptWithAi } = await import("@/lib/openai-comic");
    const revisedPage = await reviseComicPagePromptWithAi({
      episodeTitle: episode.title,
      episodeSummary: episode.summary,
      pageNumber: imagePageNumber,
      pageLabel: `Reader insert after ${formatComicPageLabel(extraPage.anchorPageNumber)}`,
      panelCount: extraPage.panelCount,
      pagePurpose: extraPage.pagePurpose,
      promptPackCopyText: extraPage.promptPackCopyText,
      referenceNotesCopyText: extraPage.referenceNotesCopyText || "",
      globalGptImage2Notes: null,
      panels: extraPage.panels,
      promptSuggestion
    });
    const nextExtraPage = {
      ...extraPage,
      pageNumber: revisedPage.pageNumber,
      panelCount: revisedPage.panelCount,
      pagePurpose: revisedPage.pagePurpose,
      promptPackCopyText: revisedPage.promptPackCopyText,
      referenceNotesCopyText: revisedPage.referenceNotesCopyText,
      panels: revisedPage.panels,
      requiredUploads: extraPage.requiredUploads
    };

    await prisma.$transaction([
      prisma.comicEpisode.update({
        where: { id: episodeId },
        data: {
          promptPack: upsertComicExtraPromptPage(episode.promptPack, nextExtraPage),
          requiredReferences: upsertComicExtraReferencePage(
            episode.requiredReferences,
            nextExtraPage
          )
        }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "EXTRA_PAGE_PROMPT_REVISION",
          model: getComicModel(),
          imageModel: getComicImageModel(),
          status: "READY",
          inputContext,
          outputSummary: `Revised ${episode.title} ${extraPage.title} insert prompt from admin suggestion.`,
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
      status: "extra-page-prompt-revised",
      episodeId,
      extraPageKey,
      pageNumber: extraPage.anchorPageNumber,
      message: `Revised ${episode.title} ${extraPage.title} insert prompt.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown comic extra page prompt revision error.";

    await prisma.comicPromptRun.create({
      data: {
        episodeId,
        promptType: "EXTRA_PAGE_PROMPT_REVISION",
        model: getComicModel(),
        imageModel: getComicImageModel(),
        status: "FAILED",
        inputContext,
        outputSummary: `${extraPage.title} insert prompt revision failed.`,
        promptPack: extraPage.promptPackCopyText,
        referenceChecklist: extraPage.referenceNotesCopyText || "",
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
      status: "extra-page-prompt-revision-failed",
      episodeId,
      extraPageKey,
      pageNumber: extraPage.anchorPageNumber,
      message: `${extraPage.title} insert prompt revision failed.`,
      errorMessage
    };
  }
}
