import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import {
  getComicCharacters,
  getComicPublishEpisodeDetail,
  getComicScenes
} from "@/lib/comic-queries";
import {
  getComicPromptHealthSummary,
  type ComicPromptPageHealth
} from "@/lib/comic-prompt-health";
import { getNeglectedComicPromptQaFindingKeys } from "@/lib/comic-prompt-health-neglect";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { getComicExtraPromptPages } from "@/lib/comic-extra-pages";
import {
  createComicResolvedReferenceImage,
  resolveComicPageReferenceImages
} from "@/lib/comic-reference-images";
import {
  getComicCharacterReferenceFiles,
  getComicReferenceChapterEntries,
  getComicReferenceSceneSlugs,
  getComicSceneReferenceFiles
} from "@/lib/comic-reference-manifest";
import {
  loadComicProductLockPromptContexts,
  resolveComicProductLockReferenceImages
} from "@/lib/comic-product-locks";
import {
  COMIC_CHINESE_PAGE_ASSET_TYPE,
  COMIC_EXTRA_PAGE_ASSET_TYPE,
  COMIC_PAGE_ASSET_TYPES,
  getComicRequiredPageNumbers
} from "@/lib/comic-pages";
import type {
  ComicEpisodeAssetRecord,
  ComicPublishCenterEpisodeRecord
} from "@/lib/types";

export const runtime = "nodejs";

type PromptPage = NonNullable<ReturnType<typeof parseComicPromptOutput>>["pages"][number];
type ReferenceLibraryGroup = "characters" | "scenes" | "extraReferences" | "productLocks";

function isDefined<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}

function attachLibraryMetadata<T extends object>(
  reference: T,
  group: ReferenceLibraryGroup,
  ownerLabel: string
) {
  return {
    ...reference,
    libraryGroup: group,
    ownerLabel
  };
}

function getExtraReferenceBucket(slug: string): "CAST_COMPARISON" | "CHAPTER_SCENE" {
  return /comparison|height|active-cast/i.test(slug) ? "CAST_COMPARISON" : "CHAPTER_SCENE";
}

function uniqueReferenceOptions<T extends { relativePath: string; imageUrl: string }>(
  references: T[]
) {
  const byKey = new Map<string, T>();

  for (const reference of references) {
    const key = reference.relativePath || reference.imageUrl;
    if (!byKey.has(key)) {
      byKey.set(key, reference);
    }
  }

  return Array.from(byKey.values());
}

async function getReferenceLibrary() {
  const [characters, scenes, productLocks] = await Promise.all([
    getComicCharacters(),
    getComicScenes(),
    loadComicProductLockPromptContexts("", { fallbackToAll: true })
  ]);
  const sceneSlugs = new Set(scenes.map((scene) => scene.slug));
  const charactersOptions = characters
    .filter((character) => character.active)
    .flatMap((character) =>
      getComicCharacterReferenceFiles(character.slug)
        .map((record) =>
          createComicResolvedReferenceImage({
            bucket: "CHARACTER",
            slug: character.slug,
            record,
            label:
              record.label.toLowerCase() === "model sheet"
                ? `${character.name} model sheet`
                : `${character.name} - ${record.label}`,
            whyThisMatters: `${character.name} was manually selected as a direct character reference.`,
            contentSummary: `${character.name} ${record.label} reference.`
          })
        )
        .filter(isDefined)
        .map((reference) =>
          attachLibraryMetadata(reference, "characters", character.name)
        )
    );
  const sceneOptions = scenes
    .filter((scene) => scene.active)
    .flatMap((scene) =>
      getComicSceneReferenceFiles(scene.slug)
        .map((record) =>
          createComicResolvedReferenceImage({
            bucket: "SCENE",
            slug: scene.slug,
            record,
            label: `${scene.name} - ${record.label}`,
            whyThisMatters: `${scene.name} was manually selected as a direct scene reference.`,
            contentSummary: `${scene.name} ${record.label} reference.`
          })
        )
        .filter(isDefined)
        .map((reference) => attachLibraryMetadata(reference, "scenes", scene.name))
    );
  const extraSceneOptions = getComicReferenceSceneSlugs()
    .filter((slug) => !sceneSlugs.has(slug))
    .flatMap((slug) =>
      getComicSceneReferenceFiles(slug)
        .map((record) =>
          createComicResolvedReferenceImage({
            bucket: getExtraReferenceBucket(slug),
            slug,
            record,
            label: record.label,
            whyThisMatters: `${record.label} was manually selected as a production reference.`,
            contentSummary: `${record.label} extra production reference.`
          })
        )
        .filter(isDefined)
        .map((reference) => attachLibraryMetadata(reference, "extraReferences", "Extra References"))
    );
  const chapterExtraOptions = getComicReferenceChapterEntries().flatMap((entry) =>
    entry.references
      .map((record) =>
        createComicResolvedReferenceImage({
          bucket: "CHAPTER_SCENE",
          slug:
            record.fileName
              .replace(/\.[a-z0-9]+$/i, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || entry.key.replace(/[^a-z0-9]+/gi, "-"),
          record,
          label: record.label,
          whyThisMatters: `${record.label} was manually selected as a chapter reference.`,
          contentSummary: `${record.label} chapter reference.`
        })
      )
      .filter(isDefined)
      .map((reference) =>
        attachLibraryMetadata(reference, "extraReferences", entry.key)
      )
  );
  const productLockOptions = resolveComicProductLockReferenceImages(productLocks).map((reference) =>
    attachLibraryMetadata(reference, "productLocks", "Product Locks")
  );

  return {
    characters: charactersOptions,
    scenes: sceneOptions,
    extraReferences: uniqueReferenceOptions([...extraSceneOptions, ...chapterExtraOptions]),
    productLocks: productLockOptions
  };
}

async function resolveReferenceImagesForPrompt(input: {
  requiredUploads: PromptPage["requiredUploads"];
  seasonSlug: string;
  chapterSlug: string;
  promptText: string;
}) {
  const [baseReferenceImages, productLocks] = await Promise.all([
    resolveComicPageReferenceImages(input),
    loadComicProductLockPromptContexts(input.promptText, {
      fallbackToAll: false
    })
  ]);

  return [
    ...baseReferenceImages,
    ...resolveComicProductLockReferenceImages(productLocks)
  ];
}

function isComicPageAsset(asset: ComicEpisodeAssetRecord) {
  return COMIC_PAGE_ASSET_TYPES.includes(asset.assetType);
}

function isComicExtraPageAsset(asset: ComicEpisodeAssetRecord) {
  return asset.assetType === COMIC_EXTRA_PAGE_ASSET_TYPE;
}

function getPageAssets(episode: ComicPublishCenterEpisodeRecord, pageNumber: number) {
  return episode.assets
    .filter((asset) => isComicPageAsset(asset) && asset.sortOrder === pageNumber)
    .sort((left, right) => {
      if (left.published !== right.published) {
        return left.published ? -1 : 1;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
}

function getChinesePageAssets(episode: ComicPublishCenterEpisodeRecord, pageNumber: number) {
  return episode.assets
    .filter(
      (asset) =>
        asset.assetType === COMIC_CHINESE_PAGE_ASSET_TYPE &&
        asset.sortOrder === pageNumber
    )
    .sort((left, right) => {
      if (left.published !== right.published) {
        return left.published ? -1 : 1;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
}

function getExtraPageAssets(
  episode: ComicPublishCenterEpisodeRecord,
  anchorPageNumber: number
) {
  return episode.assets
    .filter(
      (asset) =>
        isComicExtraPageAsset(asset) && asset.sortOrder === anchorPageNumber
    )
    .sort((left, right) => {
      if (left.published !== right.published) {
        return left.published ? -1 : 1;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
}

function getPromptHealthFindings(pages: ComicPromptPageHealth[]) {
  return pages.flatMap((pageHealth) =>
    pageHealth.findings.map((finding) => ({
      pageNumber: pageHealth.pageNumber,
      finding
    }))
  );
}

async function getEpisodePromptPages(episode: ComicPublishCenterEpisodeRecord) {
  const parsedPromptOutput = parseComicPromptOutput(episode.promptPack, episode.requiredReferences);
  const promptPageMap = new Map<number, PromptPage>(
    (parsedPromptOutput?.pages || []).map((page) => [page.pageNumber, page])
  );
  const promptHealth = getComicPromptHealthSummary(parsedPromptOutput, {
    neglectedFindingKeys: await getNeglectedComicPromptQaFindingKeys()
  });
  const promptHealthByPage = new Map(
    promptHealth.pages
      .filter((pageHealth) => pageHealth.pageNumber >= 0)
      .map((pageHealth) => [pageHealth.pageNumber, pageHealth])
  );
  const pages = await Promise.all(
    getComicRequiredPageNumbers().map(async (pageNumber) => {
      const assets = getPageAssets(episode, pageNumber);
      const chineseAssets = getChinesePageAssets(episode, pageNumber);
      const promptPage = promptPageMap.get(pageNumber) || null;
      const referenceImages = promptPage
        ? await resolveReferenceImagesForPrompt({
            requiredUploads: promptPage.requiredUploads,
            seasonSlug: episode.seasonSlug,
            chapterSlug: episode.chapterSlug,
            promptText: [
              promptPage.pagePurpose,
              promptPage.promptPackCopyText,
              promptPage.referenceNotesCopyText,
              promptPage.panels.map((panel) => panel.storyBeat).join("\n")
            ].join("\n\n")
          })
        : [];

      return {
        pageNumber,
        promptPage,
        referenceImages,
        promptRevisionHistory: episode.promptRevisionHistory
          .filter((revision) => revision.pageNumber === pageNumber)
          .slice(0, 3),
        promptHealth: promptHealthByPage.get(pageNumber) || null,
        assets,
        approvedAsset: assets.find((asset) => asset.published) || null,
        chineseAssets,
        approvedChineseAsset: chineseAssets.find((asset) => asset.published) || null
      };
    })
  );
  const extraPages = await Promise.all(
    getComicExtraPromptPages(episode.promptPack).map(async (extraPage) => {
      const assets = getExtraPageAssets(episode, extraPage.anchorPageNumber);
      const referenceImages = await resolveReferenceImagesForPrompt({
        requiredUploads: extraPage.requiredUploads,
        seasonSlug: episode.seasonSlug,
        chapterSlug: episode.chapterSlug,
        promptText: [
          extraPage.title,
          extraPage.pagePurpose,
          extraPage.promptPackCopyText,
          extraPage.referenceNotesCopyText,
          extraPage.panels.map((panel) => panel.storyBeat).join("\n")
        ].join("\n\n")
      });

      return {
        extraPageKey: extraPage.extraPageKey,
        title: extraPage.title,
        anchorPageNumber: extraPage.anchorPageNumber,
        promptPage: extraPage,
        referenceImages,
        assets,
        approvedAsset: assets.find((asset) => asset.published) || null
      };
    })
  );

  return {
    parsedPromptOutput,
    promptHealth: {
      totalPages: promptHealth.totalPages,
      readyPages: promptHealth.readyPages,
      issueCount: promptHealth.issueCount,
      warningCount: promptHealth.warningCount
    },
    promptHealthFindings: getPromptHealthFindings(promptHealth.pages),
    extraPages,
    pages
  };
}

export async function GET(request: Request) {
  if (!(await isFullAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized",
        message: "Admin login is required."
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const episodeId = url.searchParams.get("episodeId")?.trim() || "";

  if (!episodeId) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing-episode",
        message: "Comic episode is required."
      },
      { status: 400 }
    );
  }

  const episode = await getComicPublishEpisodeDetail(episodeId);

  if (!episode) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing-episode",
        message: "That comic episode could not be found."
      },
      { status: 404 }
    );
  }

  const [detail, referenceLibrary] = await Promise.all([
    getEpisodePromptPages(episode),
    getReferenceLibrary()
  ]);

  return NextResponse.json({
    ok: true,
    episodeId: episode.id,
    latestImageGenerationError: episode.latestImageGenerationError,
    referenceLibrary,
    ...detail
  });
}
