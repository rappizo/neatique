import { prisma } from "@/lib/db";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { resolveComicGenerationReferenceSelection } from "@/lib/comic-generation-reference-selection";
import { isNextRedirectError } from "@/lib/comic-action-errors";
import { buildComicMediaFallbackUrl, storeComicImage } from "@/lib/comic-image-storage";
import { createComicTaskTimer, type ComicTaskTiming } from "@/lib/comic-task-timing";
import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import {
  formatComicPageFileSlug,
  formatComicPageLabel,
  isComicPublishPageNumber
} from "@/lib/comic-pages";

export type ComicPageImageGenerationStatus =
  | "page-image-generated"
  | "page-image-failed"
  | "missing-episode"
  | "missing-page-prompt"
  | "missing-project";

export class ComicPageImageGenerationInputError extends Error {
  status: ComicPageImageGenerationStatus;

  constructor(status: ComicPageImageGenerationStatus, message: string) {
    super(message);
    this.name = "ComicPageImageGenerationInputError";
    this.status = status;
  }
}

export type ComicPageImageGenerationResult = {
  ok: boolean;
  status: ComicPageImageGenerationStatus;
  pageNumber: number;
  episodeId: string;
  assetId?: string;
  imageUrl?: string;
  referenceImageCount?: number;
  timing?: ComicTaskTiming;
  message: string;
  errorMessage?: string;
};

export async function generateComicPageImageForEpisode(input: {
  episodeId: string;
  pageNumber: number;
  attempt?: number;
  referenceImages?: unknown;
}): Promise<ComicPageImageGenerationResult> {
  const { episodeId, pageNumber } = input;
  const attempt = Math.max(input.attempt || 1, 1);
  const timer = createComicTaskTimer();

  if (!episodeId) {
    throw new ComicPageImageGenerationInputError("missing-episode", "Episode is required.");
  }

  if (!isComicPublishPageNumber(pageNumber)) {
    throw new ComicPageImageGenerationInputError("missing-page-prompt", "Page number is required.");
  }

  const episode = await timer.time("loadEpisode", () =>
    prisma.comicEpisode.findUnique({
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
    })
  );

  if (!episode?.chapter.season.project) {
    throw new ComicPageImageGenerationInputError("missing-project", "Comic project is missing.");
  }

  const parsedPromptOutput = parseComicPromptOutput(episode.promptPack, episode.requiredReferences);
  const page = parsedPromptOutput?.pages.find((candidate) => candidate.pageNumber === pageNumber);

  if (!page) {
    throw new ComicPageImageGenerationInputError(
      "missing-page-prompt",
      "Generate a page-by-page prompt package before creating page images."
    );
  }

  const { buildComicPageImagePrompt, generateComicPageImageWithAi } = await import("@/lib/openai-comic");
  const referenceDetectionText = [
    page.pagePurpose,
    page.panels
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
    page.requiredUploads
      .map((upload) => [upload.label, upload.slug, upload.contentSummary].join(" "))
      .join("\n")
  ].join("\n\n");
  const referenceSelection = await timer.time("loadReferenceContexts", () =>
    resolveComicGenerationReferenceSelection({
      requiredUploads: page.requiredUploads,
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      referenceDetectionText,
      productDetectionText: [
        page.pagePurpose,
        page.promptPackCopyText,
        page.referenceNotesCopyText,
        referenceDetectionText
      ].join("\n"),
      referenceImageOverrides: input.referenceImages
    })
  );
  const imageInput = {
    projectTitle: episode.chapter.season.project.title,
    seasonTitle: episode.chapter.season.title,
    chapterTitle: episode.chapter.title,
    episodeTitle: episode.title,
    episodeSummary: episode.summary,
    pageNumber: page.pageNumber,
    panelCount: page.panelCount,
    pagePurpose: page.pagePurpose,
    promptPackCopyText: page.promptPackCopyText,
    referenceNotesCopyText: page.referenceNotesCopyText,
    globalGptImage2Notes: parsedPromptOutput?.globalGptImage2Notes || null,
    panels: page.panels.map((panel) => ({
      pageNumber: page.pageNumber,
      ...panel,
      promptText: panel.promptText || panel.storyBeat,
      dialogueLines: panel.dialogueLines || []
    })),
    requiredUploads: page.requiredUploads,
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
      pageNumber: page.pageNumber,
      panelCount: page.panelCount,
      pagePurpose: page.pagePurpose,
      uploadImages: page.requiredUploads.flatMap((upload) => upload.uploadImageNames),
      referenceSelectionMode: referenceSelection.mode,
      referenceImages: imageInput.referenceImages.map((reference) => ({
        label: reference.label,
        fileName: reference.fileName,
        relativePath: reference.relativePath,
        source: reference.source,
        bucket: reference.bucket
      })),
      characterLocks: imageInput.characterLocks.map((character) => ({
        slug: character.slug,
        name: character.name,
        chineseName: character.chineseName,
        referenceFiles: character.referenceFiles.map((file) => file.fileName),
        hasProfileMarkdown: Boolean(character.profileMarkdown)
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
        fileName: `${formatComicPageFileSlug(page.pageNumber)}-${Date.now()}`
      })
    );
    const createdAsset = await timer.time("createAsset", () =>
      prisma.comicEpisodeAsset.create({
        data: {
          episodeId,
          assetType: "GENERATED_PAGE",
          title: `${episode.title} - ${formatComicPageLabel(page.pageNumber)}`,
          imageUrl: storedImage.imageUrl,
          imageData: storedImage.imageData,
          imageMimeType: storedImage.imageMimeType,
          imageStorageKey: storedImage.imageStorageKey,
          imageByteSize: storedImage.imageByteSize,
          imageSha256: storedImage.imageSha256,
          altText: `${episode.title} comic ${formatComicPageLabel(page.pageNumber).toLowerCase()}`,
          caption: page.pagePurpose,
          sortOrder: page.pageNumber,
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
            promptType: "PAGE_IMAGE_GENERATION",
          model: process.env.AI_TEXT_MODEL || "gpt-5.4-mini",
          imageModel: process.env.AI_IMAGE_MODEL || "gemini-3.1-flash-image",
            status: "READY",
            inputContext,
            outputSummary: `Generated ${episode.title} ${formatComicPageLabel(page.pageNumber).toLowerCase()} with ${imageInput.referenceImages.length} direct reference image${imageInput.referenceImages.length === 1 ? "" : "s"}.`,
            promptPack: page.promptPackCopyText,
            referenceChecklist: page.referenceNotesCopyText
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
      status: "page-image-generated",
      episodeId,
      pageNumber: page.pageNumber,
      assetId: createdAsset.id,
      imageUrl,
      referenceImageCount: imageInput.referenceImages.length,
      timing: timer.snapshot(),
      message: `Generated ${episode.title} ${formatComicPageLabel(page.pageNumber).toLowerCase()}.`
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown comic page image generation error.";

    await timer.time("writeFailedPromptRun", () =>
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "PAGE_IMAGE_GENERATION",
          model: process.env.AI_TEXT_MODEL || "gpt-5.4-mini",
          imageModel: process.env.AI_IMAGE_MODEL || "gemini-3.1-flash-image",
          status: "FAILED",
          inputContext,
          outputSummary: `${formatComicPageLabel(page.pageNumber)} image generation failed.`,
          promptPack: page.promptPackCopyText,
          referenceChecklist: page.referenceNotesCopyText,
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
      status: "page-image-failed",
      episodeId,
      pageNumber: page.pageNumber,
      referenceImageCount: imageInput.referenceImages.length,
      timing: timer.snapshot(),
      message: `${formatComicPageLabel(page.pageNumber)} image generation failed.`,
      errorMessage
    };
  }
}
