import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminActionResultDialog } from "@/components/admin/admin-action-result-dialog";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import {
  approveComicEpisodeAssetAction,
  publishComicEpisodeFromCenterAction,
  unapproveComicEpisodeAssetAction,
  uploadComicPageAssetAction
} from "@/app/admin/comic-editor-actions";
import {
  generateComicPageImageAction,
  generateComicPromptPackageAction
} from "@/app/admin/comic-prompt-actions";
import { getComicPublishCenter } from "@/lib/comic-queries";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { formatDate } from "@/lib/format";
import type {
  ComicEpisodeAssetRecord,
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
  "page-uploaded": "Comic page image uploaded as a draft.",
  "page-uploaded-approved": "Comic page image uploaded and approved.",
  "episode-published": "Episode published to the public comic library.",
  "prompt-generated": "A fresh 10-page prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Check the episode prompt run history.",
  "page-image-generated": "Comic page image generated and saved as a draft asset.",
  "page-image-failed": "Comic page image generation failed. Check the episode prompt run history.",
  "missing-approved-pages": "Approve pages 1-10 before publishing this episode.",
  "missing-asset": "That comic page asset could not be found.",
  "missing-upload": "Choose an image file before uploading.",
  "upload-too-large": "Comic page uploads must stay under 20MB.",
  "upload-type": "Upload PNG, JPG, WEBP, or AVIF images only.",
  "missing-page-prompt": "Generate a page-by-page prompt package before creating page images."
};

const IMAGE_RESULT_MESSAGES = {
  "page-image-generated": {
    title: "Draft image created",
    description: "The generated page image is now saved as a draft candidate on this episode. Review it here, then approve it when it is ready.",
    tone: "success"
  },
  "page-image-failed": {
    title: "Draft image creation failed",
    description: "The image request did not complete. Open the episode editor and check the latest prompt run entry for the stored error message.",
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

const COMIC_REQUIRED_PAGES_PER_EPISODE = 10;
const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];

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

function getEpisodePromptPages(episode: ComicPublishCenterEpisodeRecord) {
  const parsedPromptOutput = parseComicPromptOutput(episode.promptPack, episode.requiredReferences);
  const promptPageMap = new Map<number, PromptPage>(
    (parsedPromptOutput?.pages || []).map((page) => [page.pageNumber, page])
  );

  return {
    parsedPromptOutput,
    pages: Array.from({ length: COMIC_REQUIRED_PAGES_PER_EPISODE }, (_, index) => {
      const pageNumber = index + 1;
      const assets = getPageAssets(episode, pageNumber);

      return {
        pageNumber,
        promptPage: promptPageMap.get(pageNumber) || null,
        assets,
        approvedAsset: assets.find((asset) => asset.published) || null
      };
    })
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
          Work through each episode page by page. Generated images and uploaded outside-AI images
          stay private until one image is approved for every page from 1 to 10.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <AdminActionResultDialog status={query.status} messages={IMAGE_RESULT_MESSAGES} />

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
            const promptState = getEpisodePromptPages(episode);
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
                  {promptState.pages.map(({ pageNumber, promptPage, assets, approvedAsset }) => {
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
                          <span className="pill">{uploadNames.length} refs</span>
                        </div>

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
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="form-note">
                              No page image candidates yet. Generate one here or upload an image
                              from your outside AI tool.
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
                                modalDescription="The image API is creating one draft comic page from the stored prompt and reference notes."
                              />
                            </form>
                          ) : null}

                          <details className="admin-comic-publish-upload">
                            <summary className="admin-details-summary">Upload external image</summary>
                            <form action={uploadComicPageAssetAction} encType="multipart/form-data">
                              <input type="hidden" name="episodeId" value={episode.id} />
                              <input type="hidden" name="pageNumber" value={pageNumber} />
                              <input type="hidden" name="redirectTo" value={redirectTo} />
                              <input type="hidden" name="approveAfterUpload" value="true" />
                              <div className="field">
                                <label htmlFor={`upload-file-${episode.id}-${pageNumber}`}>Image file</label>
                                <input
                                  id={`upload-file-${episode.id}-${pageNumber}`}
                                  name="comicPageFile"
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/avif"
                                  required
                                />
                              </div>
                              <div className="field">
                                <label htmlFor={`upload-title-${episode.id}-${pageNumber}`}>Asset title</label>
                                <input
                                  id={`upload-title-${episode.id}-${pageNumber}`}
                                  name="title"
                                  defaultValue={`${episode.title} - Uploaded ${formatPageLabel(pageNumber)}`}
                                />
                              </div>
                              <div className="field">
                                <label htmlFor={`upload-alt-${episode.id}-${pageNumber}`}>Alt text</label>
                                <input
                                  id={`upload-alt-${episode.id}-${pageNumber}`}
                                  name="altText"
                                  defaultValue={`${episode.title} comic ${formatPageLabel(pageNumber)}`}
                                />
                              </div>
                              <button type="submit" className="button button--primary">
                                Upload and approve
                              </button>
                            </form>
                          </details>
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
