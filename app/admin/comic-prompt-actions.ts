"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import {
  getComicCharacterReferenceFiles,
  getComicChapterSceneReferenceState,
  getComicSceneReferenceFiles
} from "@/lib/comic-reference-manifest";
import { buildComicRedirect, revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { toInt, toPlainString } from "@/lib/utils";

export async function generateComicPromptPackageAction(formData: FormData) {
  await requireAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo =
    toPlainString(formData.get("redirectTo")) || `/admin/comic/prompt-studio?episodeId=${episodeId}`;

  if (!episodeId) {
    redirect(buildComicRedirect("/admin/comic/prompt-studio", "missing-episode"));
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
    redirect(buildComicRedirect(redirectTo, "missing-project"));
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
          model:
            process.env.OPENAI_COMIC_MODEL ||
            process.env.OPENAI_POST_MODEL ||
            process.env.OPENAI_EMAIL_MODEL ||
            "gpt-5.5",
          imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
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
    redirect(buildComicRedirect(redirectTo, "prompt-generated"));
  } catch (error) {
    await prisma.comicPromptRun.create({
      data: {
        episodeId,
        promptType: "EPISODE_PROMPT_PACKAGE",
        model:
          process.env.OPENAI_COMIC_MODEL ||
          process.env.OPENAI_POST_MODEL ||
          process.env.OPENAI_EMAIL_MODEL ||
          "gpt-5.5",
        imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
        status: "FAILED",
        inputContext,
        outputSummary: "Prompt generation failed.",
        errorMessage: error instanceof Error ? error.message : "Unknown comic prompt generation error."
      }
    });

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });
    redirect(buildComicRedirect(redirectTo, "prompt-failed"));
  }
}

export async function generateComicPageImageAction(formData: FormData) {
  await requireAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const pageNumber = toInt(formData.get("pageNumber"), 0);
  const redirectTo =
    toPlainString(formData.get("redirectTo")) || `/admin/comic/prompt-studio?episodeId=${episodeId}`;

  if (!episodeId) {
    redirect(buildComicRedirect("/admin/comic/prompt-studio", "missing-episode"));
  }

  if (!pageNumber) {
    redirect(buildComicRedirect(redirectTo, "missing-page-prompt"));
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
    redirect(buildComicRedirect(redirectTo, "missing-project"));
  }

  const parsedPromptOutput = parseComicPromptOutput(episode.promptPack, episode.requiredReferences);
  const page = parsedPromptOutput?.pages.find((candidate) => candidate.pageNumber === pageNumber);

  if (!page) {
    redirect(buildComicRedirect(redirectTo, "missing-page-prompt"));
  }

  const { buildComicPageImagePrompt, generateComicPageImageWithAi } = await import("@/lib/openai-comic");
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
      promptText: panel.storyBeat
    })),
    requiredUploads: page.requiredUploads
  };
  const inputPrompt = buildComicPageImagePrompt(imageInput);
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
      prompt: inputPrompt
    },
    null,
    2
  );

  let nextStatus = "page-image-generated";

  try {
    const imageAsset = await generateComicPageImageWithAi(imageInput);
    const createdAsset = await prisma.comicEpisodeAsset.create({
      data: {
        episodeId,
        assetType: "GENERATED_PAGE",
        title: `${episode.title} - Page ${String(page.pageNumber).padStart(2, "0")}`,
        imageUrl: "/media/comic/pending",
        imageData: imageAsset.base64Data,
        imageMimeType: imageAsset.mimeType,
        altText: `${episode.title} comic page ${page.pageNumber}`,
        caption: page.pagePurpose,
        sortOrder: page.pageNumber,
        published: false
      },
      select: {
        id: true
      }
    });

    const imageUrl = `/media/comic/${createdAsset.id}?v=${Date.now()}`;

    await prisma.$transaction([
      prisma.comicEpisodeAsset.update({
        where: { id: createdAsset.id },
        data: { imageUrl }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "PAGE_IMAGE_GENERATION",
          model:
            process.env.OPENAI_COMIC_MODEL ||
            process.env.OPENAI_POST_MODEL ||
            process.env.OPENAI_EMAIL_MODEL ||
            "gpt-5.5",
          imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
          status: "READY",
          inputContext,
          outputSummary: `Generated ${episode.title} page ${page.pageNumber}.`,
          promptPack: page.promptPackCopyText,
          referenceChecklist: page.referenceNotesCopyText
        }
      })
    ]);

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });
  } catch (error) {
    nextStatus = "page-image-failed";
    await prisma.comicPromptRun.create({
      data: {
        episodeId,
        promptType: "PAGE_IMAGE_GENERATION",
        model:
          process.env.OPENAI_COMIC_MODEL ||
          process.env.OPENAI_POST_MODEL ||
          process.env.OPENAI_EMAIL_MODEL ||
          "gpt-5.5",
        imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
        status: "FAILED",
        inputContext,
        outputSummary: `Page ${page.pageNumber} image generation failed.`,
        promptPack: page.promptPackCopyText,
        referenceChecklist: page.referenceNotesCopyText,
        errorMessage: error instanceof Error ? error.message : "Unknown comic page image generation error."
      }
    });

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });
  }

  redirect(buildComicRedirect(redirectTo, nextStatus));
}
