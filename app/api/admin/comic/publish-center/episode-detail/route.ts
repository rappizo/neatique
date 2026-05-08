import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getComicPublishEpisodeDetail } from "@/lib/comic-queries";
import {
  getComicPromptHealthSummary,
  type ComicPromptPageHealth
} from "@/lib/comic-prompt-health";
import { getNeglectedComicPromptQaFindingKeys } from "@/lib/comic-prompt-health-neglect";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { resolveComicPageReferenceImages } from "@/lib/comic-reference-images";
import {
  COMIC_CHINESE_PAGE_ASSET_TYPE,
  COMIC_PAGE_ASSET_TYPES,
  getComicRequiredPageNumbers
} from "@/lib/comic-pages";
import type {
  ComicEpisodeAssetRecord,
  ComicPublishCenterEpisodeRecord
} from "@/lib/types";

export const runtime = "nodejs";

type PromptPage = NonNullable<ReturnType<typeof parseComicPromptOutput>>["pages"][number];

function isComicPageAsset(asset: ComicEpisodeAssetRecord) {
  return COMIC_PAGE_ASSET_TYPES.includes(asset.assetType);
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
        ? await resolveComicPageReferenceImages({
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

  return {
    parsedPromptOutput,
    promptHealth: {
      totalPages: promptHealth.totalPages,
      readyPages: promptHealth.readyPages,
      issueCount: promptHealth.issueCount,
      warningCount: promptHealth.warningCount
    },
    promptHealthFindings: getPromptHealthFindings(promptHealth.pages),
    pages
  };
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
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

  const detail = await getEpisodePromptPages(episode);

  return NextResponse.json({
    ok: true,
    episodeId: episode.id,
    latestImageGenerationError: episode.latestImageGenerationError,
    ...detail
  });
}
