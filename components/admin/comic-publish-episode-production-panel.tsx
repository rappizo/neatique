"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ComicChinesePageVersionQueueButton,
  ComicEditImageQueueForm,
  ComicGenerateAllChinesePagesQueueButton,
  ComicGenerateAllImagesQueueButton,
  ComicGenerateExtraPageQueueButton,
  ComicGenerateImageQueueButton,
  ComicGeneratePromptPackageQueueButton,
  ComicReviseExtraPagePromptQueueForm,
  ComicRevisePromptQueueForm,
  useComicImageTaskQueue
} from "@/components/admin/comic-image-task-queue";
import {
  ComicAssetApprovalControls,
  ComicChineseApprovalHeadingPill,
  ComicChinesePageStatusPill,
  ComicEpisodeDownloadMenu,
  ComicEpisodePublishControls,
  ComicPublishPageArticle,
  ComicPublishPageHeaderStatus
} from "@/components/admin/comic-publish-approval-controls";
import { ComicPageUploadForm } from "@/components/admin/comic-publish-page-upload-form";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import {
  approveComicExtraPageAssetAction,
  deleteComicEpisodeAssetAction,
  unapproveComicExtraPageAssetAction
} from "@/app/admin/comic-editor-actions";
import {
  neglectComicPromptQaFindingAction,
  restoreComicPagePromptRevisionAction
} from "@/app/admin/comic-prompt-actions";
import { formatComicPageLabel } from "@/lib/comic-pages";
import { formatDate } from "@/lib/format";

type SerializedComicEpisodeAsset = {
  id: string;
  assetType: string;
  title: string;
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
  published: boolean;
  episodeId: string;
  createdAt: string;
  updatedAt: string;
};

type SerializedComicPagePromptRevision = {
  id: string;
  pageNumber: number;
  status: string;
  promptSuggestion: string | null;
  previousPromptPack: string | null;
  previousReferenceChecklist: string | null;
  revisedPromptPack: string | null;
  revisedReferenceChecklist: string | null;
  outputSummary: string;
  errorMessage: string | null;
  createdAt: string;
};

type SerializedComicReferenceImage = {
  bucket: string;
  label: string;
  slug: string;
  fileName: string;
  relativePath: string;
  imageUrl: string;
  mimeType: string;
  sizeBytes: number;
  whyThisMatters: string;
  contentSummary: string;
  source: string;
};

type SerializedPromptPage = {
  pageNumber: number;
  panelCount: number;
  pagePurpose: string;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  panels: Array<{
    panelNumber: number;
    panelTitle: string;
    storyBeat: string;
    promptText: string;
    dialogueLines: Array<{ speaker: string; text: string }>;
  }>;
  requiredUploads: Array<{
    bucket: string;
    label: string;
    slug: string;
    whyThisMatters: string;
    contentSummary: string;
    uploadImageNames: string[];
    relativePaths: string[];
  }>;
};

type SerializedPromptFinding = {
  key: string;
  severity: "issue" | "warning";
  message: string;
};

type SerializedPromptPageHealth = {
  pageNumber: number;
  ready: boolean;
  issueCount: number;
  warningCount: number;
  findings: SerializedPromptFinding[];
};

type ComicEpisodeProductionPage = {
  pageNumber: number;
  promptPage: SerializedPromptPage | null;
  referenceImages: SerializedComicReferenceImage[];
  promptRevisionHistory: SerializedComicPagePromptRevision[];
  promptHealth: SerializedPromptPageHealth | null;
  assets: SerializedComicEpisodeAsset[];
  approvedAsset: SerializedComicEpisodeAsset | null;
  chineseAssets: SerializedComicEpisodeAsset[];
  approvedChineseAsset: SerializedComicEpisodeAsset | null;
};

type ComicEpisodeProductionExtraPage = {
  extraPageKey: string;
  title: string;
  anchorPageNumber: number;
  promptPage: SerializedPromptPage;
  referenceImages: SerializedComicReferenceImage[];
  assets: SerializedComicEpisodeAsset[];
  approvedAsset: SerializedComicEpisodeAsset | null;
};

type ComicEpisodeProductionDetail = {
  ok: true;
  episodeId: string;
  parsedPromptOutput: unknown | null;
  promptHealth: {
    totalPages: number;
    readyPages: number;
    issueCount: number;
    warningCount: number;
  };
  promptHealthFindings: Array<{
    pageNumber: number;
    finding: SerializedPromptFinding;
  }>;
  extraPages: ComicEpisodeProductionExtraPage[];
  pages: ComicEpisodeProductionPage[];
};

type ComicPublishEpisodeProductionPanelProps = {
  chapterId: string;
  episodeId: string;
  episodeTitle: string;
  episodePublished: boolean;
};

const EPISODE_DETAIL_REFRESH_TASK_KINDS = new Set([
  "generate",
  "extra-page-generation",
  "edit",
  "prompt-package",
  "prompt-revision",
  "extra-page-prompt-revision",
  "chinese-page-version"
]);

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { message?: string; error?: string };
  return candidate.message || candidate.error || fallback;
}

function buildRedirectTo(chapterId: string, episodeId: string) {
  return `/admin/comic/publish-center/chapters/${chapterId}#episode-${episodeId}`;
}

function buildEpisodeDownloadHref(episodeId: string, language: "en" | "zh") {
  return `/api/admin/comic/episode-download?episodeId=${encodeURIComponent(episodeId)}&language=${language}`;
}

function formatHealthFindingPrefix(pageNumber: number) {
  return pageNumber >= 0 ? formatComicPageLabel(pageNumber) : "Prompt package";
}

function getUploadNames(page: SerializedPromptPage | null) {
  if (!page) {
    return [];
  }

  return Array.from(
    new Set(page.requiredUploads.flatMap((upload) => upload.uploadImageNames).filter(Boolean))
  );
}

function getRevisionStatusLabel(revision: SerializedComicPagePromptRevision) {
  return revision.status === "READY" ? "Updated" : revision.status;
}

function formatSerializedDate(value: string | null | undefined) {
  return formatDate(value ? new Date(value) : null);
}

function PromptHealthFindingList({
  findings,
  redirectTo
}: {
  findings: Array<{
    pageNumber: number;
    finding: SerializedPromptFinding;
  }>;
  redirectTo: string;
}) {
  if (findings.length === 0) {
    return null;
  }

  return (
    <div className="admin-comic-health-list">
      {findings.map(({ pageNumber, finding }, findingIndex) => (
        <div
          key={`${pageNumber}-${finding.key}-${findingIndex}`}
          className={
            finding.severity === "issue"
              ? "admin-comic-health-item admin-comic-health-item--issue"
              : "admin-comic-health-item admin-comic-health-item--warning"
          }
        >
          <span>
            <strong>{formatHealthFindingPrefix(pageNumber)}:</strong> {finding.message}
          </span>
          <form action={neglectComicPromptQaFindingAction}>
            <input type="hidden" name="findingKey" value={finding.key} />
            <input type="hidden" name="severity" value={finding.severity} />
            <input type="hidden" name="message" value={finding.message} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button type="submit" className="button button--ghost button--compact">
              Neglect
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

function ComicExtraPageProductionSlot({
  episodeId,
  extraPage,
  redirectTo
}: {
  episodeId: string;
  extraPage: ComicEpisodeProductionExtraPage;
  redirectTo: string;
}) {
  const uploadNames = getUploadNames(extraPage.promptPage);

  return (
    <article
      className={
        extraPage.approvedAsset
          ? "admin-comic-publish-page is-approved"
          : "admin-comic-publish-page"
      }
    >
      <div className="admin-comic-publish-page__header">
        <div>
          <p className="eyebrow">Reader insert after {formatComicPageLabel(extraPage.anchorPageNumber)}</p>
          <h3>{extraPage.title}</h3>
          <p className="form-note">{extraPage.promptPage.pagePurpose}</p>
        </div>
        <span
          className={
            extraPage.approvedAsset
              ? "admin-table__status-badge admin-table__status-badge--success"
              : "admin-table__status-badge admin-table__status-badge--warning"
          }
        >
          {extraPage.approvedAsset ? "Approved insert" : "Needs approval"}
        </span>
      </div>

      <div className="stack-row">
        <span className="pill">{extraPage.promptPage.panelCount} panels</span>
        <span className="pill">{extraPage.assets.length} image candidates</span>
        <span className="pill">{extraPage.referenceImages.length} direct refs</span>
        <span className="pill">Does not count as Page 01</span>
      </div>

      <div className="admin-comic-reference-preview">
        <div className="admin-comic-reference-preview__header">
          <strong>Reference images sent to image API</strong>
          <span className="form-note">
            {extraPage.referenceImages.length > 0
              ? `${extraPage.referenceImages.length} image${extraPage.referenceImages.length === 1 ? "" : "s"}`
              : "No direct image references resolved"}
          </span>
        </div>
        {extraPage.referenceImages.length > 0 ? (
          <div className="admin-comic-reference-grid">
            {extraPage.referenceImages.map((reference) => (
              <a
                key={`${episodeId}-${extraPage.extraPageKey}-${reference.relativePath}`}
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
            This insert will fall back to text-only generation unless the prompt mentions a known
            character or required upload path.
          </p>
        )}
      </div>

      <details className="admin-comic-publish-details">
        <summary className="admin-details-summary">Open insert prompt</summary>
        <div className="admin-comic-publish-prompt">
          <div className="stack-row">
            <CopyTextButton
              text={extraPage.promptPage.promptPackCopyText}
              label="Copy prompt"
              copiedLabel="Prompt copied"
            />
            {extraPage.promptPage.referenceNotesCopyText ? (
              <CopyTextButton
                text={extraPage.promptPage.referenceNotesCopyText}
                label="Copy refs"
                copiedLabel="Refs copied"
              />
            ) : null}
          </div>
          <div className="admin-comic-copy-grid">
            <div className="field">
              <label>Image prompt</label>
              <textarea rows={10} value={extraPage.promptPage.promptPackCopyText} readOnly />
            </div>
            <div className="field">
              <label>Reference notes</label>
              <textarea
                rows={10}
                value={extraPage.promptPage.referenceNotesCopyText || "No reference notes listed."}
                readOnly
              />
            </div>
          </div>
          {uploadNames.length > 0 ? (
            <div className="stack-row">
              {uploadNames.map((uploadName) => (
                <span key={`${episodeId}-${extraPage.extraPageKey}-${uploadName}`} className="pill">
                  {uploadName}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </details>

      <div className="admin-comic-publish-assets">
        {extraPage.assets.length > 0 ? (
          extraPage.assets.map((asset) => (
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
                    {asset.assetType} / {formatSerializedDate(asset.createdAt)}
                  </span>
                </div>
                <div className="stack-row">
                  {asset.published ? (
                    <form action={unapproveComicExtraPageAssetAction}>
                      <input type="hidden" name="id" value={asset.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button type="submit" className="button button--ghost">
                        Unapprove insert
                      </button>
                    </form>
                  ) : (
                    <form action={approveComicExtraPageAssetAction}>
                      <input type="hidden" name="id" value={asset.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button type="submit" className="button button--secondary">
                        Approve insert
                      </button>
                    </form>
                  )}
                  <form action={deleteComicEpisodeAssetAction}>
                    <input type="hidden" name="id" value={asset.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" className="button button--ghost">
                      Reject insert
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="form-note">No insert page image candidates yet. Generate one here.</p>
        )}
      </div>

      <div className="admin-comic-publish-page__actions">
        <ComicGenerateExtraPageQueueButton
          episodeId={episodeId}
          extraPageKey={extraPage.extraPageKey}
          anchorPageNumber={extraPage.anchorPageNumber}
        />
        <ComicReviseExtraPagePromptQueueForm
          episodeId={episodeId}
          extraPageKey={extraPage.extraPageKey}
          anchorPageNumber={extraPage.anchorPageNumber}
        />
      </div>
    </article>
  );
}

export function ComicPublishEpisodeProductionPanel({
  chapterId,
  episodeId,
  episodeTitle,
  episodePublished
}: ComicPublishEpisodeProductionPanelProps) {
  const { tasks } = useComicImageTaskQueue();
  const [detail, setDetail] = useState<ComicEpisodeProductionDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = useMemo(() => buildRedirectTo(chapterId, episodeId), [chapterId, episodeId]);
  const episodeDetailRefreshKey = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.episodeId === episodeId &&
            EPISODE_DETAIL_REFRESH_TASK_KINDS.has(task.kind) &&
            (task.status === "success" || task.status === "failed")
        )
        .map((task) =>
          [
            task.id,
            task.kind,
            task.status,
            task.completedAt || "",
            task.assetId || "",
            task.imageUrl || ""
          ].join(":")
        )
        .sort()
        .join("|"),
    [tasks, episodeId]
  );

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    async function loadDetail() {
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/admin/comic/publish-center/episode-detail?episodeId=${encodeURIComponent(episodeId)}`,
          {
            cache: "no-store",
            signal: abortController.signal
          }
        );
        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(extractErrorMessage(payload, "Comic episode production detail failed to load."));
        }

        if (!payload || typeof payload !== "object" || !(payload as { ok?: boolean }).ok) {
          throw new Error("Comic episode production detail response was incomplete.");
        }

        if (active) {
          setDetail(payload as ComicEpisodeProductionDetail);
        }
      } catch (error) {
        if (!active || (error instanceof Error && error.name === "AbortError")) {
          return;
        }

        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Comic episode production detail failed to load."
          );
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [episodeId, episodeDetailRefreshKey]);

  if (errorMessage) {
    return (
      <div className="admin-comic-health-summary">
        <div>
          <h3>Episode detail unavailable</h3>
          <p className="form-note">{errorMessage}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }

  if (!detail) {
    return <p className="form-note">Loading episode production board...</p>;
  }

  const missingChinesePages = detail.pages
    .filter((page) => page.approvedAsset && !page.approvedChineseAsset)
    .map((page) => ({
      sourceAssetId: page.approvedAsset?.id || "",
      episodeId,
      pageNumber: page.pageNumber
    }))
    .filter((page) => page.sourceAssetId);

  return (
    <>
      <div className="admin-comic-publish-episode__controls">
        <div className="admin-comic-publish-episode__actions">
          <Link
            href={`/admin/comic/outline-studio?scope=episode&id=${episodeId}`}
            className="button button--secondary"
          >
            Outline studio
          </Link>
          <ComicGeneratePromptPackageQueueButton
            episodeId={episodeId}
            idleLabel={detail.parsedPromptOutput ? "Regenerate prompts" : "Generate prompts"}
            className="button button--secondary"
            taskLabel={`Prompts: ${episodeTitle}`}
          />
          {detail.parsedPromptOutput ? (
            <ComicGenerateAllImagesQueueButton
              episodeId={episodeId}
              pageNumbers={detail.pages
                .filter((page) => page.promptPage)
                .map((page) => page.pageNumber)}
              idleLabel="Generate all page drafts"
            />
          ) : null}
          {missingChinesePages.length > 0 ? (
            <ComicGenerateAllChinesePagesQueueButton pages={missingChinesePages} />
          ) : null}
          <ComicEpisodePublishControls episodeId={episodeId} />
          <ComicEpisodeDownloadMenu
            englishHref={buildEpisodeDownloadHref(episodeId, "en")}
            chineseHref={buildEpisodeDownloadHref(episodeId, "zh")}
          />
        </div>
      </div>

      {detail.promptHealthFindings.length > 0 ? (
        <div className="admin-comic-health-summary">
          <div>
            <h3>Prompt QA details</h3>
            <p className="form-note">
              Fix issues before generation; warnings mark continuity risks to review.
            </p>
          </div>
          <PromptHealthFindingList findings={detail.promptHealthFindings} redirectTo={redirectTo} />
        </div>
      ) : null}

      <div className="admin-comic-publish-page-grid">
        {detail.pages.map((page) => {
          const uploadNames = getUploadNames(page.promptPage);
          const pageHealth = page.promptHealth;
          const anchoredExtraPages = detail.extraPages.filter(
            (extraPage) => extraPage.anchorPageNumber === page.pageNumber
          );

          return (
            <div key={`${episodeId}-${page.pageNumber}`} className="admin-comic-page-section">
            <ComicPublishPageArticle
              episodeId={episodeId}
              pageNumber={page.pageNumber}
              initiallyApproved={Boolean(page.approvedAsset)}
            >
              <div className="admin-comic-publish-page__header">
                <div>
                  <p className="eyebrow">{formatComicPageLabel(page.pageNumber)}</p>
                  <h3>{page.promptPage?.pagePurpose || "No page prompt generated yet"}</h3>
                </div>
                <ComicPublishPageHeaderStatus
                  episodeId={episodeId}
                  pageNumber={page.pageNumber}
                  initiallyApproved={Boolean(page.approvedAsset)}
                  hasDraftAssets={page.assets.length > 0}
                />
              </div>

              <div className="stack-row">
                <span className="pill">{page.promptPage?.panelCount || 0} panels</span>
                <span className="pill">{page.assets.length} image candidates</span>
                <span className="pill">{page.referenceImages.length} direct refs</span>
                {pageHealth ? (
                  <span
                    className={
                      pageHealth.issueCount
                        ? "pill pill--danger"
                        : pageHealth.warningCount
                          ? "pill pill--warning"
                          : "pill pill--success"
                    }
                  >
                    {pageHealth.issueCount
                      ? `${pageHealth.issueCount} prompt issue${pageHealth.issueCount === 1 ? "" : "s"}`
                      : pageHealth.warningCount
                        ? `${pageHealth.warningCount} QA warning${pageHealth.warningCount === 1 ? "" : "s"}`
                        : "Prompt QA ready"}
                  </span>
                ) : null}
                <ComicChinesePageStatusPill
                  episodeId={episodeId}
                  pageNumber={page.pageNumber}
                  initiallyChineseApproved={Boolean(page.approvedChineseAsset)}
                  hasChineseAssets={page.chineseAssets.length > 0}
                />
              </div>

              {pageHealth?.findings.length ? (
                <PromptHealthFindingList
                  findings={pageHealth.findings.map((finding) => ({
                    pageNumber: page.pageNumber,
                    finding
                  }))}
                  redirectTo={redirectTo}
                />
              ) : null}

              {page.promptPage ? (
                <div className="admin-comic-reference-preview">
                  <div className="admin-comic-reference-preview__header">
                    <strong>Reference images sent to image API</strong>
                    <span className="form-note">
                      {page.referenceImages.length > 0
                        ? `${page.referenceImages.length} image${page.referenceImages.length === 1 ? "" : "s"}`
                        : "No direct image references resolved"}
                    </span>
                  </div>
                  {page.referenceImages.length > 0 ? (
                    <div className="admin-comic-reference-grid">
                      {page.referenceImages.map((reference) => (
                        <a
                          key={`${episodeId}-${page.pageNumber}-${reference.relativePath}`}
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
                      This page will fall back to text-only generation unless the prompt mentions a
                      known character or required upload path.
                    </p>
                  )}
                </div>
              ) : null}

              {page.promptPage ? (
                <details className="admin-comic-publish-details">
                  <summary className="admin-details-summary">Open page prompt</summary>
                  <div className="admin-comic-publish-prompt">
                    <div className="stack-row">
                      <CopyTextButton
                        text={page.promptPage.promptPackCopyText}
                        label="Copy prompt"
                        copiedLabel="Prompt copied"
                      />
                      {page.promptPage.referenceNotesCopyText ? (
                        <CopyTextButton
                          text={page.promptPage.referenceNotesCopyText}
                          label="Copy refs"
                          copiedLabel="Refs copied"
                        />
                      ) : null}
                    </div>
                    <div className="admin-comic-copy-grid">
                      <div className="field">
                        <label>Image prompt</label>
                        <textarea rows={10} value={page.promptPage.promptPackCopyText} readOnly />
                      </div>
                      <div className="field">
                        <label>Reference notes</label>
                        <textarea
                          rows={10}
                          value={page.promptPage.referenceNotesCopyText || "No reference notes listed."}
                          readOnly
                        />
                      </div>
                    </div>
                    {uploadNames.length > 0 ? (
                      <div className="stack-row">
                        {uploadNames.map((uploadName) => (
                          <span key={`${episodeId}-${page.pageNumber}-${uploadName}`} className="pill">
                            {uploadName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}

              {page.promptRevisionHistory.length > 0 ? (
                <details className="admin-comic-prompt-history">
                  <summary className="admin-details-summary">
                    Prompt revision history ({page.promptRevisionHistory.length})
                  </summary>
                  <div className="admin-comic-prompt-history__list">
                    {page.promptRevisionHistory.map((revision) => (
                      <article key={revision.id} className="admin-comic-prompt-history__item">
                        <div className="admin-comic-prompt-history__header">
                          <div>
                            <strong>{getRevisionStatusLabel(revision)}</strong>
                            <span className="form-note">
                              {formatSerializedDate(revision.createdAt)}
                            </span>
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
                              <input type="hidden" name="episodeId" value={episodeId} />
                              <input type="hidden" name="revisionId" value={revision.id} />
                              <input type="hidden" name="pageNumber" value={page.pageNumber} />
                              <input type="hidden" name="restoreVersion" value="previous" />
                              <input type="hidden" name="redirectTo" value={redirectTo} />
                              <button type="submit" className="button button--ghost">
                                Restore previous prompt
                              </button>
                            </form>
                          ) : null}
                          {revision.revisedPromptPack ? (
                            <form action={restoreComicPagePromptRevisionAction}>
                              <input type="hidden" name="episodeId" value={episodeId} />
                              <input type="hidden" name="revisionId" value={revision.id} />
                              <input type="hidden" name="pageNumber" value={page.pageNumber} />
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
                {page.assets.length > 0 ? (
                  page.assets.map((asset) => (
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
                            {asset.assetType} / {formatSerializedDate(asset.createdAt)}
                          </span>
                        </div>
                        <ComicAssetApprovalControls
                          assetId={asset.id}
                          episodeId={episodeId}
                          pageNumber={page.pageNumber}
                          language="en"
                          initiallyApproved={asset.published}
                        >
                          <ComicChinesePageVersionQueueButton
                            sourceAssetId={asset.id}
                            episodeId={episodeId}
                            pageNumber={page.pageNumber}
                            hasApprovedChineseAsset={Boolean(page.approvedChineseAsset)}
                          />
                          {page.approvedChineseAsset ? (
                            <a
                              href={page.approvedChineseAsset.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="button button--ghost"
                            >
                              View Approved Chinese
                            </a>
                          ) : null}
                        </ComicAssetApprovalControls>
                        <ComicEditImageQueueForm
                          sourceAssetId={asset.id}
                          episodeId={episodeId}
                          pageNumber={page.pageNumber}
                        />
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

              {page.chineseAssets.length > 0 ? (
                <div className="admin-comic-page-section">
                  <div className="admin-comic-section-heading">
                    <h4>Chinese versions</h4>
                    <ComicChineseApprovalHeadingPill
                      episodeId={episodeId}
                      pageNumber={page.pageNumber}
                      initiallyChineseApproved={Boolean(page.approvedChineseAsset)}
                      hasChineseAssets={page.chineseAssets.length > 0}
                    />
                  </div>
                  <div className="admin-comic-publish-assets">
                    {page.chineseAssets.map((asset) => (
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
                              Chinese version / {formatSerializedDate(asset.createdAt)}
                            </span>
                          </div>
                          <ComicAssetApprovalControls
                            assetId={asset.id}
                            episodeId={episodeId}
                            pageNumber={page.pageNumber}
                            language="zh"
                            initiallyApproved={asset.published}
                          />
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
                {page.promptPage ? (
                  <ComicGenerateImageQueueButton
                    episodeId={episodeId}
                    pageNumber={page.pageNumber}
                    className="button button--secondary"
                  />
                ) : null}

                <ComicPageUploadForm
                  episodeId={episodeId}
                  episodeTitle={episodeTitle}
                  pageNumber={page.pageNumber}
                  pagePurpose={page.promptPage?.pagePurpose}
                  episodePublished={episodePublished}
                />

                {page.promptPage ? (
                  <ComicRevisePromptQueueForm
                    episodeId={episodeId}
                    pageNumber={page.pageNumber}
                  />
                ) : null}
              </div>
            </ComicPublishPageArticle>
            {anchoredExtraPages.map((extraPage) => (
              <ComicExtraPageProductionSlot
                key={`${episodeId}-${extraPage.extraPageKey}`}
                episodeId={episodeId}
                extraPage={extraPage}
                redirectTo={redirectTo}
              />
            ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
