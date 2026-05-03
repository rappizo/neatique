import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminActionResultDialog } from "@/components/admin/admin-action-result-dialog";
import {
  ComicChinesePageVersionQueueButton,
  ComicEditImageQueueForm,
  ComicGenerateAllImagesQueueButton,
  ComicGenerateAllChinesePagesQueueButton,
  ComicGenerateImageQueueButton,
  ComicGeneratePromptPackageQueueButton,
  ComicImageTaskQueueProvider,
  ComicRevisePromptQueueForm
} from "@/components/admin/comic-image-task-queue";
import { ComicPublishEpisodeDetails } from "@/components/admin/comic-publish-episode-details";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import {
  approveChineseComicPageAssetAction,
  approveComicEpisodeAssetAction,
  deleteComicEpisodeAssetAction,
  publishComicEpisodeFromCenterAction,
  unapproveChineseComicPageAssetAction,
  unapproveComicEpisodeAssetAction,
  unpublishComicEpisodeFromCenterAction
} from "@/app/admin/comic-editor-actions";
import { restoreComicPagePromptRevisionAction } from "@/app/admin/comic-prompt-actions";
import { getComicPublishCenter } from "@/lib/comic-queries";
import { getComicPromptHealthSummary } from "@/lib/comic-prompt-health";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { resolveComicPageReferenceImages } from "@/lib/comic-reference-images";
import { formatDate } from "@/lib/format";
import type {
  ComicEpisodeAssetRecord,
  ComicPagePromptRevisionRecord,
  ComicPublishCenterChapterRecord,
  ComicPublishCenterEpisodeRecord,
  ComicPublishCenterSeasonRecord
} from "@/lib/types";

type AdminComicPublishChapterPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "page-approved": "Comic page approved.",
  "page-unapproved": "Comic page approval was removed.",
  "page-rejected": "Comic page image was rejected and deleted.",
  "page-chinese-created": "Chinese comic page draft created. Approve it before it appears on the public Chinese page.",
  "page-chinese-approved": "Chinese comic page approved.",
  "page-chinese-unapproved": "Chinese comic page approval was removed.",
  "page-chinese-failed": "Chinese comic page version creation failed. Check the episode prompt run history.",
  "episode-published": "Episode published to the public comic library.",
  "episode-unpublished": "Episode unpublished. Approved pages are still saved, but the episode is hidden from the public comic library.",
  "unpublish-before-approval-change": "Unpublish this episode before removing or deleting an approved comic page.",
  "prompt-generated": "A fresh 10-page prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Check the episode prompt run history.",
  "page-image-generated": "Comic page image generated and saved as a draft asset.",
  "page-image-failed": "Comic page image generation failed. Check the episode prompt run history.",
  "page-edit-created": "Comic page edit saved as a new draft candidate.",
  "page-edit-failed": "Comic page edit failed. Check the episode prompt run history.",
  "page-prompt-revised": "Comic page prompt updated.",
  "page-prompt-restored": "Comic page prompt restored from history.",
  "page-prompt-revision-failed": "Comic page prompt revision failed. Check the episode prompt run history.",
  "missing-approved-pages": "Approve pages 1-10 before publishing this episode.",
  "missing-approved-page": "Approve an English page image before creating a Chinese version.",
  "missing-asset": "That comic page asset could not be found.",
  "missing-source-image": "This page image does not have stored image data for AI editing.",
  "missing-prompt-suggestion": "Enter a prompt suggestion before updating this page prompt.",
  "missing-page-edit-instruction": "Enter an edit instruction before editing this page image.",
  "missing-page-prompt": "Generate a page-by-page prompt package before creating page images.",
  "missing-prompt-revision": "That prompt revision history entry could not be restored."
};

function buildImageResultMessages(errorMessage?: string | null) {
  return {
    "page-image-generated": {
      title: "Draft image created",
      description:
        "The generated page image is now saved as a draft candidate on this episode. Review it here, then approve it when it is ready.",
      tone: "success"
    },
    "page-image-failed": {
      title: "Draft image creation failed",
      description: errorMessage
        ? `OpenAI returned: ${errorMessage}`
        : "The image request did not complete. Open the episode editor and check the latest prompt run entry for the stored error message.",
      tone: "danger"
    },
    "page-edit-created": {
      title: "Page edit created",
      description:
        "The edited page image is saved as a new draft candidate. Review it here, then approve it if it is the best version.",
      tone: "success"
    },
    "page-edit-failed": {
      title: "Page edit failed",
      description: errorMessage
        ? `OpenAI returned: ${errorMessage}`
        : "The page image edit did not complete. Open the episode editor and check the latest prompt run entry for the stored error message.",
      tone: "danger"
    },
    "missing-page-prompt": {
      title: "No page prompt found",
      description: "Generate the episode's 10-page prompt package before creating a draft image.",
      tone: "warning"
    },
    "missing-project": {
      title: "Comic project is missing",
      description: "Save the comic project bible first so the image workflow has canon context.",
      tone: "warning"
    }
  } as const;
}

const COMIC_REQUIRED_PAGES_PER_EPISODE = 10;
const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];
const COMIC_CHINESE_PAGE_ASSET_TYPE = "CHINESE_PAGE";

type PromptPage = NonNullable<ReturnType<typeof parseComicPromptOutput>>["pages"][number];

type ChapterMatch = {
  season: ComicPublishCenterSeasonRecord;
  chapter: ComicPublishCenterChapterRecord;
};

function isComicPageAsset(asset: ComicEpisodeAssetRecord) {
  return COMIC_PAGE_ASSET_TYPES.includes(asset.assetType);
}

function formatPageLabel(pageNumber: number) {
  return `Page ${String(pageNumber).padStart(2, "0")}`;
}

function getChapterMatch(
  seasons: ComicPublishCenterSeasonRecord[],
  chapterId: string
): ChapterMatch | null {
  for (const season of seasons) {
    const chapter = season.chapters.find((candidate) => candidate.id === chapterId);

    if (chapter) {
      return { season, chapter };
    }
  }

  return null;
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

async function getEpisodePromptPages(
  episode: ComicPublishCenterEpisodeRecord,
  seasonSlug: string,
  chapterSlug: string
) {
  const parsedPromptOutput = parseComicPromptOutput(episode.promptPack, episode.requiredReferences);
  const promptPageMap = new Map<number, PromptPage>(
    (parsedPromptOutput?.pages || []).map((page) => [page.pageNumber, page])
  );
  const pages = await Promise.all(
    Array.from({ length: COMIC_REQUIRED_PAGES_PER_EPISODE }, async (_, index) => {
      const pageNumber = index + 1;
      const assets = getPageAssets(episode, pageNumber);
      const chineseAssets = getChinesePageAssets(episode, pageNumber);
      const promptPage = promptPageMap.get(pageNumber) || null;
      const referenceImages = promptPage
        ? await resolveComicPageReferenceImages({
            requiredUploads: promptPage.requiredUploads,
            seasonSlug,
            chapterSlug,
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
        assets,
        approvedAsset: assets.find((asset) => asset.published) || null,
        chineseAssets,
        approvedChineseAsset: chineseAssets.find((asset) => asset.published) || null
      };
    })
  );

  return {
    parsedPromptOutput,
    pages
  };
}

function getUploadNames(page: PromptPage | null) {
  if (!page) {
    return [];
  }

  return Array.from(
    new Set(page.requiredUploads.flatMap((upload) => upload.uploadImageNames).filter(Boolean))
  );
}

function getRevisionStatusLabel(revision: ComicPagePromptRevisionRecord) {
  return revision.status === "READY" ? "Updated" : revision.status;
}

function getAssetStatusClass(asset: ComicEpisodeAssetRecord) {
  return asset.published
    ? "admin-table__status-badge admin-table__status-badge--success"
    : "admin-table__status-badge admin-table__status-badge--warning";
}

function buildRedirectTo(chapterId: string, episodeId: string) {
  return `/admin/comic/publish-center/chapters/${chapterId}#episode-${episodeId}`;
}

function buildEpisodeDownloadHref(episodeId: string, language: "en" | "zh") {
  return `/api/admin/comic/episode-download?episodeId=${encodeURIComponent(episodeId)}&language=${language}`;
}

export default async function AdminComicPublishChapterPage({
  params,
  searchParams
}: AdminComicPublishChapterPageProps) {
  const [{ id }, query, publishCenter] = await Promise.all([
    params,
    searchParams,
    getComicPublishCenter()
  ]);
  const match = getChapterMatch(publishCenter.seasons, id);

  if (!match) {
    notFound();
  }

  const { season, chapter } = match;
  const requiredPageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.requiredPageCount,
    0
  );
  const approvedPageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.approvedPageCount,
    0
  );
  const approvedChinesePageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.approvedChinesePageCount,
    0
  );
  const readyEpisodeCount = chapter.episodes.filter(
    (episode) => episode.canPublish && !episode.published
  ).length;
  const latestImageGenerationError = chapter.episodes
    .filter((episode) => episode.latestImageGenerationAt)
    .sort(
      (left, right) =>
        (right.latestImageGenerationAt?.getTime() || 0) -
        (left.latestImageGenerationAt?.getTime() || 0)
    )[0]?.latestImageGenerationError;
  const episodePromptStates = new Map(
    await Promise.all(
      chapter.episodes.map(async (episode) => [
        episode.id,
        await getEpisodePromptPages(episode, season.slug, chapter.slug)
      ] as const)
    )
  );

  return (
    <ComicImageTaskQueueProvider maxConcurrent={5}>
      <div className="admin-page admin-page--comic-publish">
      <div className="stack-row">
        <Link href="/admin/comic/publish-center" className="button button--secondary">
          Back to publish center
        </Link>
        <Link href={`/admin/comic/chapters/${chapter.id}`} className="button button--ghost">
          Edit chapter
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">
          Comic / Publish Center / Season {season.seasonNumber}
        </p>
        <h1>{chapter.title}</h1>
        <p>
          Work through each episode page by page. Generated images stay private until one image is
          approved for every page from 1 to 10.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <AdminActionResultDialog
        status={query.status}
        messages={buildImageResultMessages(latestImageGenerationError)}
      />

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Chapter</p>
          <h3>{season.title}</h3>
          <p>
            Chapter {chapter.chapterNumber} has {chapter.episodes.length} episode
            {chapter.episodes.length === 1 ? "" : "s"} in production.
          </p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Approved pages</p>
          <h3>
            {approvedPageCount} / {requiredPageCount}
          </h3>
          <p>English public pages need 10 approved images per episode.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Chinese approved</p>
          <h3>
            {approvedChinesePageCount} / {requiredPageCount}
          </h3>
          <p>Chinese public pages and downloads use the same 10-page approval rule.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Ready</p>
          <h3>{readyEpisodeCount} episodes</h3>
          <p>Publish stays disabled until the English version has all 10 approved pages.</p>
        </section>
      </div>

      {chapter.episodes.length > 0 ? (
        <div className="admin-comic-publish-stack">
          {chapter.episodes.map((episode) => {
            const promptState =
              episodePromptStates.get(episode.id) || {
                parsedPromptOutput: null,
                pages: []
              };
            const redirectTo = buildRedirectTo(chapter.id, episode.id);
            const englishDownloadReady = episode.canPublish;
            const chineseDownloadReady = episode.canPublishChinese;
            const promptHealth = getComicPromptHealthSummary(promptState.parsedPromptOutput);
            const promptHealthByPage = new Map(
              promptHealth.pages
                .filter((pageHealth) => pageHealth.pageNumber > 0)
                .map((pageHealth) => [pageHealth.pageNumber, pageHealth])
            );
            const missingChinesePages = promptState.pages
              .filter((page) => page.approvedAsset && !page.approvedChineseAsset)
              .map((page) => ({
                sourceAssetId: page.approvedAsset?.id || "",
                episodeId: episode.id,
                pageNumber: page.pageNumber
              }))
              .filter((page) => page.sourceAssetId);

            return (
              <ComicPublishEpisodeDetails
                key={episode.id}
                id={`episode-${episode.id}`}
                storageKey={`neatique:comic-publish-center:${chapter.id}:episode:${episode.id}:open`}
                episodeNumber={episode.episodeNumber}
                title={episode.title}
                summary={episode.summary}
                published={episode.published}
                englishApprovedCount={episode.approvedPageCount}
                chineseApprovedCount={episode.approvedChinesePageCount}
                requiredPageCount={episode.requiredPageCount}
                draftPageCount={episode.draftPageCount}
                hasPromptPackage={Boolean(promptState.parsedPromptOutput)}
                promptReadyCount={promptHealth.readyPages}
                promptIssueCount={promptHealth.issueCount}
              >
                <div className="admin-comic-publish-episode__controls">
                  <div className="admin-comic-publish-episode__actions">
                    <Link href={`/admin/comic/episodes/${episode.id}`} className="button button--secondary">
                      Episode editor
                    </Link>
                    <ComicGeneratePromptPackageQueueButton
                      episodeId={episode.id}
                      idleLabel={promptState.parsedPromptOutput ? "Regenerate prompts" : "Generate prompts"}
                      className="button button--secondary"
                      taskLabel={`Prompts: ${episode.title}`}
                    />
                    {promptState.parsedPromptOutput ? (
                      <ComicGenerateAllImagesQueueButton
                        episodeId={episode.id}
                        pageNumbers={promptState.pages
                          .filter((page) => page.promptPage)
                          .map((page) => page.pageNumber)}
                        idleLabel="Generate all page drafts"
                      />
                    ) : null}
                    {missingChinesePages.length > 0 ? (
                      <ComicGenerateAllChinesePagesQueueButton pages={missingChinesePages} />
                    ) : null}
                    <form action={publishComicEpisodeFromCenterAction}>
                      <input type="hidden" name="episodeId" value={episode.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <PendingSubmitButton
                        idleLabel={episode.published ? "Refresh public episode" : "Publish episode"}
                        pendingLabel="Publishing..."
                        disabled={!episode.canPublish}
                        modalTitle="Publishing comic episode"
                        modalDescription="The episode, chapter, and season will be made public with the approved page images."
                      />
                    </form>
                    {episode.published ? (
                      <form action={unpublishComicEpisodeFromCenterAction}>
                        <input type="hidden" name="episodeId" value={episode.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" className="button button--ghost">
                          Unpublish episode
                        </button>
                      </form>
                    ) : null}
                    <details className="admin-comic-download-menu">
                      <summary className="button button--ghost">Download</summary>
                      <div className="admin-comic-download-menu__panel">
                        {englishDownloadReady ? (
                          <a href={buildEpisodeDownloadHref(episode.id, "en")}>
                            English ZIP
                          </a>
                        ) : (
                          <span className="is-disabled">
                            English ZIP ({episode.approvedPageCount}/{episode.requiredPageCount})
                          </span>
                        )}
                        {chineseDownloadReady ? (
                          <a href={buildEpisodeDownloadHref(episode.id, "zh")}>
                            Chinese ZIP
                          </a>
                        ) : (
                          <span className="is-disabled">
                            Chinese ZIP ({episode.approvedChinesePageCount}/{episode.requiredPageCount})
                          </span>
                        )}
                      </div>
                    </details>
                  </div>
                </div>

                <div className="admin-comic-publish-page-grid">
                  {promptState.pages.map(({
                    pageNumber,
                    promptPage,
                    referenceImages,
                    promptRevisionHistory,
                    assets,
                    approvedAsset,
                    chineseAssets,
                    approvedChineseAsset
                  }) => {
                    const uploadNames = getUploadNames(promptPage);
                    const pageStatus = approvedAsset
                      ? "Approved"
                      : assets.length > 0
                        ? "Needs approval"
                        : "Needs image";
                    const pageHealth = promptHealthByPage.get(pageNumber);

                    return (
                      <article
                        key={`${episode.id}-${pageNumber}`}
                        className={
                          approvedAsset
                            ? "admin-comic-publish-page is-approved"
                            : "admin-comic-publish-page"
                        }
                      >
                        <div className="admin-comic-publish-page__header">
                          <div>
                            <p className="eyebrow">{formatPageLabel(pageNumber)}</p>
                            <h3>{promptPage?.pagePurpose || "No page prompt generated yet"}</h3>
                          </div>
                          <span
                            className={
                              approvedAsset
                                ? "admin-table__status-badge admin-table__status-badge--success"
                                : "admin-table__status-badge admin-table__status-badge--warning"
                            }
                          >
                            {pageStatus}
                          </span>
                        </div>

                        <div className="stack-row">
                          <span className="pill">{promptPage?.panelCount || 0} panels</span>
                          <span className="pill">{assets.length} image candidates</span>
                          <span className="pill">{referenceImages.length} direct refs</span>
                          {pageHealth ? (
                            <span className={pageHealth.ready ? "pill pill--success" : "pill pill--danger"}>
                              {pageHealth.ready ? "Prompt QA ready" : `${pageHealth.issueCount} prompt issues`}
                            </span>
                          ) : null}
                          {approvedChineseAsset ? <span className="pill">Chinese approved</span> : null}
                          {!approvedChineseAsset && chineseAssets.length > 0 ? (
                            <span className="pill">Chinese draft ready</span>
                          ) : null}
                        </div>

                        {promptPage ? (
                          <div className="admin-comic-reference-preview">
                            <div className="admin-comic-reference-preview__header">
                              <strong>Reference images sent to image API</strong>
                              <span className="form-note">
                                {referenceImages.length > 0
                                  ? `${referenceImages.length} image${referenceImages.length === 1 ? "" : "s"}`
                                  : "No direct image references resolved"}
                              </span>
                            </div>
                            {referenceImages.length > 0 ? (
                              <div className="admin-comic-reference-grid">
                                {referenceImages.map((reference) => (
                                  <a
                                    key={`${episode.id}-${pageNumber}-${reference.relativePath}`}
                                    href={reference.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="admin-comic-reference-card"
                                  >
                                    <Image
                                      src={reference.imageUrl}
                                      alt={reference.label}
                                      width={120}
                                      height={120}
                                      unoptimized
                                    />
                                    <span>{reference.label}</span>
                                    <small>{reference.fileName}</small>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="form-note">
                                This page will fall back to text-only generation unless the prompt
                                mentions a known character or required upload path.
                              </p>
                            )}
                          </div>
                        ) : null}

                        {promptPage ? (
                          <details className="admin-comic-publish-details">
                            <summary className="admin-details-summary">Open page prompt</summary>
                            <div className="admin-comic-publish-prompt">
                              <div className="stack-row">
                                <CopyTextButton
                                  text={promptPage.promptPackCopyText}
                                  label="Copy prompt"
                                  copiedLabel="Prompt copied"
                                />
                                {promptPage.referenceNotesCopyText ? (
                                  <CopyTextButton
                                    text={promptPage.referenceNotesCopyText}
                                    label="Copy refs"
                                    copiedLabel="Refs copied"
                                  />
                                ) : null}
                              </div>
                              <div className="admin-comic-copy-grid">
                                <div className="field">
                                  <label>Image prompt</label>
                                  <textarea rows={10} value={promptPage.promptPackCopyText} readOnly />
                                </div>
                                <div className="field">
                                  <label>Reference notes</label>
                                  <textarea
                                    rows={10}
                                    value={promptPage.referenceNotesCopyText || "No reference notes listed."}
                                    readOnly
                                  />
                                </div>
                              </div>
                              {uploadNames.length > 0 ? (
                                <div className="stack-row">
                                  {uploadNames.map((uploadName) => (
                                    <span key={`${episode.id}-${pageNumber}-${uploadName}`} className="pill">
                                      {uploadName}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {pageHealth?.findings.length ? (
                                <div className="admin-comic-health-list">
                                  {pageHealth.findings.map((finding, findingIndex) => (
                                    <span
                                      key={`${episode.id}-${pageNumber}-${finding.severity}-${findingIndex}`}
                                      className={
                                        finding.severity === "issue"
                                          ? "admin-comic-health-item admin-comic-health-item--issue"
                                          : "admin-comic-health-item admin-comic-health-item--warning"
                                      }
                                    >
                                      {finding.message}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </details>
                        ) : null}

                        {promptRevisionHistory.length > 0 ? (
                          <details className="admin-comic-prompt-history">
                            <summary className="admin-details-summary">
                              Prompt revision history ({promptRevisionHistory.length})
                            </summary>
                            <div className="admin-comic-prompt-history__list">
                              {promptRevisionHistory.map((revision) => (
                                <article key={revision.id} className="admin-comic-prompt-history__item">
                                  <div className="admin-comic-prompt-history__header">
                                    <div>
                                      <strong>{getRevisionStatusLabel(revision)}</strong>
                                      <span className="form-note">{formatDate(revision.createdAt)}</span>
                                    </div>
                                    <span
                                      className={
                                        revision.status === "READY"
                                          ? "admin-table__status-badge admin-table__status-badge--success"
                                          : "admin-table__status-badge admin-table__status-badge--warning"
                                      }
                                    >
                                      {revision.status}
                                    </span>
                                  </div>
                                  {revision.promptSuggestion ? (
                                    <p className="form-note">Suggestion: {revision.promptSuggestion}</p>
                                  ) : null}
                                  {revision.errorMessage ? (
                                    <p className="form-note">Error: {revision.errorMessage}</p>
                                  ) : null}
                                  <div className="stack-row">
                                    {revision.previousPromptPack ? (
                                      <form action={restoreComicPagePromptRevisionAction}>
                                        <input type="hidden" name="episodeId" value={episode.id} />
                                        <input type="hidden" name="revisionId" value={revision.id} />
                                        <input type="hidden" name="pageNumber" value={pageNumber} />
                                        <input type="hidden" name="restoreVersion" value="previous" />
                                        <input type="hidden" name="redirectTo" value={redirectTo} />
                                        <button type="submit" className="button button--ghost">
                                          Restore previous prompt
                                        </button>
                                      </form>
                                    ) : null}
                                    {revision.revisedPromptPack ? (
                                      <form action={restoreComicPagePromptRevisionAction}>
                                        <input type="hidden" name="episodeId" value={episode.id} />
                                        <input type="hidden" name="revisionId" value={revision.id} />
                                        <input type="hidden" name="pageNumber" value={pageNumber} />
                                        <input type="hidden" name="restoreVersion" value="revised" />
                                        <input type="hidden" name="redirectTo" value={redirectTo} />
                                        <button type="submit" className="button button--secondary">
                                          Restore revised prompt
                                        </button>
                                      </form>
                                    ) : null}
                                  </div>
                                </article>
                              ))}
                            </div>
                          </details>
                        ) : null}

                        <div className="admin-comic-publish-assets">
                          {assets.length > 0 ? (
                            assets.map((asset) => (
                              <div key={asset.id} className="admin-comic-publish-asset">
                                <a
                                  href={asset.imageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="admin-comic-publish-asset__image"
                                >
                                  <Image
                                    src={asset.imageUrl}
                                    alt={asset.altText || asset.title}
                                    width={240}
                                    height={360}
                                    unoptimized
                                  />
                                </a>
                                <div className="admin-comic-publish-asset__body">
                                  <div className="admin-table__cell-stack">
                                    <strong>{asset.title}</strong>
                                    <span className="form-note">
                                      {asset.assetType} / {formatDate(asset.createdAt)}
                                    </span>
                                  </div>
                                  <span className={getAssetStatusClass(asset)}>
                                    {asset.published ? "Approved" : "Draft"}
                                  </span>
                                  <form
                                    action={
                                      asset.published
                                        ? unapproveComicEpisodeAssetAction
                                        : approveComicEpisodeAssetAction
                                    }
                                  >
                                    <input type="hidden" name="id" value={asset.id} />
                                    <input type="hidden" name="redirectTo" value={redirectTo} />
                                    <button
                                      type="submit"
                                      className={asset.published ? "button button--ghost" : "button button--primary"}
                                    >
                                      {asset.published ? "Remove approval" : "Approve this page"}
                                    </button>
                                  </form>
                                  <ComicEditImageQueueForm
                                    sourceAssetId={asset.id}
                                    episodeId={episode.id}
                                    pageNumber={pageNumber}
                                  />
                                  {asset.published ? (
                                    <ComicChinesePageVersionQueueButton
                                      sourceAssetId={asset.id}
                                      episodeId={episode.id}
                                      pageNumber={pageNumber}
                                      hasApprovedChineseAsset={Boolean(approvedChineseAsset)}
                                    />
                                  ) : null}
                                  {asset.published && approvedChineseAsset ? (
                                    <a
                                      href={approvedChineseAsset.imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="button button--ghost"
                                    >
                                      View Approved Chinese
                                    </a>
                                  ) : null}
                                  <form action={deleteComicEpisodeAssetAction}>
                                    <input type="hidden" name="id" value={asset.id} />
                                    <input type="hidden" name="redirectTo" value={redirectTo} />
                                    <button type="submit" className="button button--ghost">
                                      Reject image
                                    </button>
                                  </form>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="form-note">
                              No page image candidates yet. Generate one here from the stored page prompt.
                            </p>
                          )}
                        </div>

                        {chineseAssets.length > 0 ? (
                          <div className="admin-comic-page-section">
                            <div className="admin-comic-section-heading">
                              <h4>Chinese versions</h4>
                              <span className="pill">
                                {approvedChineseAsset ? "1 approved" : "Approval needed"}
                              </span>
                            </div>
                            <div className="admin-comic-publish-assets">
                              {chineseAssets.map((asset) => (
                                <div key={asset.id} className="admin-comic-publish-asset">
                                  <a
                                    href={asset.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="admin-comic-publish-asset__image"
                                  >
                                    <Image
                                      src={asset.imageUrl}
                                      alt={asset.altText || asset.title}
                                      width={240}
                                      height={360}
                                      unoptimized
                                    />
                                  </a>
                                  <div className="admin-comic-publish-asset__body">
                                    <div className="admin-table__cell-stack">
                                      <strong>{asset.title}</strong>
                                      <span className="form-note">
                                        Chinese version / {formatDate(asset.createdAt)}
                                      </span>
                                    </div>
                                    <span className={getAssetStatusClass(asset)}>
                                      {asset.published ? "Chinese Approved" : "Chinese Draft"}
                                    </span>
                                    <form
                                      action={
                                        asset.published
                                          ? unapproveChineseComicPageAssetAction
                                          : approveChineseComicPageAssetAction
                                      }
                                    >
                                      <input type="hidden" name="id" value={asset.id} />
                                      <input type="hidden" name="redirectTo" value={redirectTo} />
                                      <button
                                        type="submit"
                                        className={
                                          asset.published ? "button button--ghost" : "button button--primary"
                                        }
                                      >
                                        {asset.published ? "Remove Chinese approval" : "Approve Chinese version"}
                                      </button>
                                    </form>
                                    <a
                                      href={asset.imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="button button--ghost"
                                    >
                                      View Chinese Version
                                    </a>
                                    <form action={deleteComicEpisodeAssetAction}>
                                      <input type="hidden" name="id" value={asset.id} />
                                      <input type="hidden" name="redirectTo" value={redirectTo} />
                                      <button type="submit" className="button button--ghost">
                                        Reject Chinese image
                                      </button>
                                    </form>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="admin-comic-publish-page__actions">
                          {promptPage ? (
                            <ComicGenerateImageQueueButton
                              episodeId={episode.id}
                              pageNumber={pageNumber}
                              className="button button--secondary"
                            />
                          ) : null}

                          {promptPage ? (
                            <ComicRevisePromptQueueForm
                              episodeId={episode.id}
                              pageNumber={pageNumber}
                            />
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </ComicPublishEpisodeDetails>
            );
          })}
        </div>
      ) : (
        <section className="admin-form">
          <h2>No episodes in this chapter yet</h2>
          <p className="form-note">
            Add episodes to this chapter first. They will appear here as production boards with
            10 page approval slots.
          </p>
          <Link href={`/admin/comic/chapters/${chapter.id}`} className="button button--primary">
            Add episodes
          </Link>
        </section>
      )}
      </div>
    </ComicImageTaskQueueProvider>
  );
}
