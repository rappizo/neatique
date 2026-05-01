import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminActionResultDialog } from "@/components/admin/admin-action-result-dialog";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import {
  approveComicEpisodeAssetAction,
  createChineseComicPageVersionAction,
  deleteComicEpisodeAssetAction,
  publishComicEpisodeFromCenterAction,
  unapproveComicEpisodeAssetAction
} from "@/app/admin/comic-editor-actions";
import {
  generateComicPageImageAction,
  generateComicPromptPackageAction,
  reviseComicPagePromptAction
} from "@/app/admin/comic-prompt-actions";
import { getComicPublishCenter } from "@/lib/comic-queries";
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
  "page-chinese-created": "Chinese comic page version created.",
  "page-chinese-failed": "Chinese comic page version creation failed. Check the episode prompt run history.",
  "episode-published": "Episode published to the public comic library.",
  "prompt-generated": "A fresh 10-page prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Check the episode prompt run history.",
  "page-image-generated": "Comic page image generated and saved as a draft asset.",
  "page-image-failed": "Comic page image generation failed. Check the episode prompt run history.",
  "page-prompt-revised": "Comic page prompt updated.",
  "page-prompt-revision-failed": "Comic page prompt revision failed. Check the episode prompt run history.",
  "missing-approved-pages": "Approve pages 1-10 before publishing this episode.",
  "missing-approved-page": "Approve an English page image before creating a Chinese version.",
  "missing-asset": "That comic page asset could not be found.",
  "missing-source-image": "This approved page does not have stored image data for AI editing.",
  "missing-prompt-suggestion": "Enter a prompt suggestion before updating this page prompt.",
  "missing-page-prompt": "Generate a page-by-page prompt package before creating page images."
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

function getChinesePageAsset(episode: ComicPublishCenterEpisodeRecord, pageNumber: number) {
  return (
    episode.assets
      .filter(
        (asset) =>
          asset.assetType === COMIC_CHINESE_PAGE_ASSET_TYPE &&
          asset.published &&
          asset.sortOrder === pageNumber
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] || null
  );
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
        chineseAsset: getChinesePageAsset(episode, pageNumber)
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
          <p>Each episode needs 10 approved pages before publishing.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Ready</p>
          <h3>{readyEpisodeCount} episodes</h3>
          <p>Ready episodes can be published directly to the public comic library.</p>
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

            return (
              <section
                key={episode.id}
                id={`episode-${episode.id}`}
                className="admin-form admin-comic-publish-episode"
              >
                <div className="admin-comic-publish-episode__header">
                  <div>
                    <p className="eyebrow">
                      Episode {episode.episodeNumber} / {episode.published ? "Published" : "Draft"}
                    </p>
                    <h2>{episode.title}</h2>
                    <p className="form-note">{episode.summary || "No episode summary yet."}</p>
                    <div className="stack-row">
                      <span className="pill">
                        {episode.approvedPageCount} / {episode.requiredPageCount} approved
                      </span>
                      <span className="pill">{episode.draftPageCount} draft images</span>
                      <span className="pill">
                        {promptState.parsedPromptOutput ? "10-page prompts loaded" : "No prompts yet"}
                      </span>
                    </div>
                  </div>
                  <div className="admin-comic-publish-episode__actions">
                    <Link href={`/admin/comic/episodes/${episode.id}`} className="button button--secondary">
                      Episode editor
                    </Link>
                    <Link
                      href={`/admin/comic/prompt-studio?episodeId=${episode.id}`}
                      className="button button--ghost"
                    >
                      Prompt studio
                    </Link>
                    <form action={generateComicPromptPackageAction}>
                      <input type="hidden" name="episodeId" value={episode.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <PendingSubmitButton
                        idleLabel={promptState.parsedPromptOutput ? "Regenerate prompts" : "Generate prompts"}
                        pendingLabel="Generating..."
                        className="button button--secondary"
                        modalTitle="Generating comic prompts"
                        modalDescription="The system is building a 10-page prompt package for this episode."
                      />
                    </form>
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
                  </div>
                </div>

                <div className="admin-comic-publish-page-grid">
                  {promptState.pages.map(({ pageNumber, promptPage, referenceImages, promptRevisionHistory, assets, approvedAsset, chineseAsset }) => {
                    const uploadNames = getUploadNames(promptPage);
                    const pageStatus = approvedAsset
                      ? "Approved"
                      : assets.length > 0
                        ? "Needs approval"
                        : "Needs image";

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
                          {chineseAsset ? <span className="pill">Chinese version ready</span> : null}
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
                                      <CopyTextButton
                                        text={revision.previousPromptPack}
                                        label="Copy previous prompt"
                                        copiedLabel="Previous copied"
                                      />
                                    ) : null}
                                    {revision.revisedPromptPack ? (
                                      <CopyTextButton
                                        text={revision.revisedPromptPack}
                                        label="Copy revised prompt"
                                        copiedLabel="Revised copied"
                                      />
                                    ) : null}
                                    {revision.previousReferenceChecklist ? (
                                      <CopyTextButton
                                        text={revision.previousReferenceChecklist}
                                        label="Copy previous refs"
                                        copiedLabel="Previous refs copied"
                                      />
                                    ) : null}
                                    {revision.revisedReferenceChecklist ? (
                                      <CopyTextButton
                                        text={revision.revisedReferenceChecklist}
                                        label="Copy revised refs"
                                        copiedLabel="Revised refs copied"
                                      />
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
                                  {asset.published ? (
                                    <form action={createChineseComicPageVersionAction}>
                                      <input type="hidden" name="id" value={asset.id} />
                                      <input type="hidden" name="redirectTo" value={redirectTo} />
                                      <PendingSubmitButton
                                        idleLabel={
                                          chineseAsset
                                            ? "Recreate Chinese Version"
                                            : "Create Chinese Version"
                                        }
                                        pendingLabel="Creating Chinese..."
                                        className="button button--secondary"
                                        modalTitle={`Creating Chinese ${formatPageLabel(pageNumber)}`}
                                        modalDescription="The image API is translating visible comic text into Simplified Chinese while preserving the approved page artwork."
                                      />
                                    </form>
                                  ) : null}
                                  {asset.published && chineseAsset ? (
                                    <a
                                      href={chineseAsset.imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="button button--ghost"
                                    >
                                      View Chinese Version
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

                        <div className="admin-comic-publish-page__actions">
                          {promptPage ? (
                            <form action={generateComicPageImageAction}>
                              <input type="hidden" name="episodeId" value={episode.id} />
                              <input type="hidden" name="pageNumber" value={pageNumber} />
                              <input type="hidden" name="redirectTo" value={redirectTo} />
                              <PendingSubmitButton
                                idleLabel="Generate draft image"
                                pendingLabel="Creating..."
                                className="button button--secondary"
                                modalTitle={`Creating ${formatPageLabel(pageNumber)}`}
                                modalDescription="The image API is creating one draft comic page from the stored prompt and the direct reference images shown above."
                              />
                            </form>
                          ) : null}

                          {promptPage ? (
                            <form
                              action={reviseComicPagePromptAction}
                              className="admin-comic-prompt-suggestion-form"
                            >
                              <input type="hidden" name="episodeId" value={episode.id} />
                              <input type="hidden" name="pageNumber" value={pageNumber} />
                              <input type="hidden" name="redirectTo" value={redirectTo} />
                              <div className="field">
                                <label htmlFor={`prompt-suggestion-${episode.id}-${pageNumber}`}>
                                  Prompt suggestion
                                </label>
                                <textarea
                                  id={`prompt-suggestion-${episode.id}-${pageNumber}`}
                                  name="promptSuggestion"
                                  rows={3}
                                  placeholder="Describe what should change in Chinese or English..."
                                  required
                                />
                              </div>
                              <PendingSubmitButton
                                idleLabel="Update page prompt"
                                pendingLabel="Updating..."
                                className="button button--ghost"
                                modalTitle={`Updating ${formatPageLabel(pageNumber)} prompt`}
                                modalDescription="The model is revising this one page prompt from your suggestion while preserving character locks and continuity."
                              />
                            </form>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
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
  );
}
