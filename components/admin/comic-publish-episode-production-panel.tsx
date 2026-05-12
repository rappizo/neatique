"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
  ComicPublishPageHeaderStatus,
  dispatchApprovalChange
} from "@/components/admin/comic-publish-approval-controls";
import {
  useComicPublishEpisodeStatus,
  type ComicPublishCenterMutationResult
} from "@/components/admin/comic-publish-episode-details";
import { ComicPageUploadForm } from "@/components/admin/comic-publish-page-upload-form";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import {
  approveComicExtraPageAssetAction,
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
  libraryGroup?: string;
  ownerLabel?: string;
};

type SerializedComicReferenceLibrary = {
  characters: SerializedComicReferenceImage[];
  scenes: SerializedComicReferenceImage[];
  extraReferences: SerializedComicReferenceImage[];
  productLocks: SerializedComicReferenceImage[];
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
  referenceLibrary: SerializedComicReferenceLibrary;
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

type ComicRejectAssetMutationResult = ComicPublishCenterMutationResult & {
  deletedAssetId?: string;
};

type ComicPublishEpisodeProductionPanelProps = {
  chapterId: string;
  episodeId: string;
  episodeTitle: string;
  episodePublished: boolean;
  redirectTo?: string;
  outlineHref?: string;
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

const REFERENCE_LIBRARY_GROUPS: Array<{
  key: keyof SerializedComicReferenceLibrary;
  label: string;
}> = [
  { key: "characters", label: "Characters" },
  { key: "scenes", label: "Scenes" },
  { key: "extraReferences", label: "Scenes / Extra References" },
  { key: "productLocks", label: "Product Locks" }
];

function getPageReferenceSlotKey(pageNumber: number) {
  return `page:${pageNumber}`;
}

function getExtraPageReferenceSlotKey(extraPageKey: string) {
  return `extra:${extraPageKey}`;
}

function getReferenceSelectionStorageKey(episodeId: string, slotKey: string) {
  return `neatique:comic-reference-selection:${episodeId}:${slotKey}`;
}

function getReferenceIdentity(reference: SerializedComicReferenceImage) {
  return [
    reference.bucket,
    reference.slug,
    reference.relativePath || reference.imageUrl,
    reference.fileName
  ].join(":");
}

function isSerializedReferenceImage(value: unknown): value is SerializedComicReferenceImage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const reference = value as Partial<SerializedComicReferenceImage>;
  return (
    typeof reference.bucket === "string" &&
    typeof reference.label === "string" &&
    typeof reference.slug === "string" &&
    typeof reference.fileName === "string" &&
    typeof reference.relativePath === "string" &&
    typeof reference.imageUrl === "string"
  );
}

function readStoredReferenceSelection(episodeId: string, slotKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(getReferenceSelectionStorageKey(episodeId, slotKey));
    const parsed = stored ? JSON.parse(stored) : null;

    return Array.isArray(parsed) ? parsed.filter(isSerializedReferenceImage) : null;
  } catch {
    return null;
  }
}

function writeStoredReferenceSelection(
  episodeId: string,
  slotKey: string,
  referenceImages: SerializedComicReferenceImage[] | null
) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getReferenceSelectionStorageKey(episodeId, slotKey);

  if (referenceImages === null) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(referenceImages));
}

async function runRejectAssetMutation(assetId: string) {
  const response = await fetch("/api/admin/comic/publish-center", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "delete-asset",
      assetId
    })
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Comic image rejection failed."));
  }

  return payload as ComicRejectAssetMutationResult;
}

function restoreScrollPosition(scrollX: number, scrollY: number) {
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  });
}

function applyApprovedAssetState<TAsset extends SerializedComicEpisodeAsset>(
  assets: TAsset[],
  approvedAssetId?: string | null
) {
  return assets.map((asset) => ({
    ...asset,
    published: approvedAssetId ? asset.id === approvedAssetId : false
  }));
}

function applyRejectedAssetResult(
  detail: ComicEpisodeProductionDetail,
  result: ComicRejectAssetMutationResult
) {
  const deletedAssetId = result.deletedAssetId || result.assetId;

  if (!deletedAssetId) {
    return detail;
  }

  const pages = detail.pages.map((page) => {
    const pageAssets = page.assets.filter((asset) => asset.id !== deletedAssetId);
    const chineseAssets = page.chineseAssets.filter((asset) => asset.id !== deletedAssetId);
    const nextPage = {
      ...page,
      assets: pageAssets,
      approvedAsset: page.approvedAsset?.id === deletedAssetId ? null : page.approvedAsset,
      chineseAssets,
      approvedChineseAsset:
        page.approvedChineseAsset?.id === deletedAssetId ? null : page.approvedChineseAsset
    };

    if (result.pageNumber !== page.pageNumber || !result.language) {
      return nextPage;
    }

    const nextEnglishAssets = applyApprovedAssetState(pageAssets, result.approvedAssetId);
    const nextChineseAssets = applyApprovedAssetState(
      chineseAssets,
      result.approvedChineseAssetId
    );

    return {
      ...nextPage,
      assets: nextEnglishAssets,
      approvedAsset:
        result.approvedAssetId
          ? nextEnglishAssets.find((asset) => asset.id === result.approvedAssetId) || null
          : null,
      chineseAssets: nextChineseAssets,
      approvedChineseAsset:
        result.approvedChineseAssetId
          ? nextChineseAssets.find((asset) => asset.id === result.approvedChineseAssetId) || null
          : null
    };
  });
  const extraPages = detail.extraPages.map((extraPage) => ({
    ...extraPage,
    assets: extraPage.assets.filter((asset) => asset.id !== deletedAssetId),
    approvedAsset:
      extraPage.approvedAsset?.id === deletedAssetId ? null : extraPage.approvedAsset
  }));

  return {
    ...detail,
    pages,
    extraPages
  };
}

function ComicRejectAssetButton({
  assetId,
  label,
  onRejectAsset
}: {
  assetId: string;
  label: string;
  onRejectAsset: (assetId: string) => Promise<void>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    startTransition(async () => {
      setMessage(null);

      try {
        await onRejectAsset(assetId);
        restoreScrollPosition(scrollX, scrollY);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Comic image rejection failed.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="button button--ghost"
        onClick={handleReject}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Rejecting..." : label}
      </button>
      {message ? <span className="form-note">{message}</span> : null}
    </>
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

function ComicReferenceImageSelector({
  referenceImages,
  autoReferenceImages,
  referenceLibrary,
  isOverridden,
  emptyMessage,
  onChange,
  onReset
}: {
  referenceImages: SerializedComicReferenceImage[];
  autoReferenceImages: SerializedComicReferenceImage[];
  referenceLibrary: SerializedComicReferenceLibrary;
  isOverridden: boolean;
  emptyMessage: string;
  onChange: (referenceImages: SerializedComicReferenceImage[]) => void;
  onReset: () => void;
}) {
  const availableGroups = useMemo(
    () => REFERENCE_LIBRARY_GROUPS.filter((group) => referenceLibrary[group.key]?.length > 0),
    [referenceLibrary]
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<keyof SerializedComicReferenceLibrary>(
    availableGroups[0]?.key || "characters"
  );
  const selectedKeys = useMemo(
    () => new Set(referenceImages.map(getReferenceIdentity)),
    [referenceImages]
  );
  const activeOptions = referenceLibrary[activeGroup] || [];
  const activeGroupLabel =
    REFERENCE_LIBRARY_GROUPS.find((group) => group.key === activeGroup)?.label || "References";

  useEffect(() => {
    if (availableGroups.length === 0) {
      return;
    }

    if (!availableGroups.some((group) => group.key === activeGroup)) {
      setActiveGroup(availableGroups[0].key);
    }
  }, [activeGroup, availableGroups]);

  function removeReference(reference: SerializedComicReferenceImage) {
    const removeKey = getReferenceIdentity(reference);
    onChange(referenceImages.filter((candidate) => getReferenceIdentity(candidate) !== removeKey));
  }

  function addReference(reference: SerializedComicReferenceImage) {
    const addKey = getReferenceIdentity(reference);

    if (selectedKeys.has(addKey)) {
      return;
    }

    onChange([
      ...referenceImages,
      {
        ...reference,
        source: "manual-selection"
      }
    ]);
  }

  return (
    <div className="admin-comic-reference-preview">
      <div className="admin-comic-reference-preview__header">
        <div>
          <strong>Reference images sent to image API</strong>
          {isOverridden ? <span className="pill">Manual</span> : null}
        </div>
        <div className="stack-row">
          <span className="form-note">
            {referenceImages.length > 0
              ? `${referenceImages.length} image${referenceImages.length === 1 ? "" : "s"}`
              : "No direct image references selected"}
          </span>
          {isOverridden ? (
            <button type="button" className="button button--ghost button--compact" onClick={onReset}>
              Reset auto
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-comic-reference-grid">
        {referenceImages.map((reference) => (
          <div
            key={getReferenceIdentity(reference)}
            className="admin-comic-reference-card-wrap"
          >
            <a
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
            <button
              type="button"
              className="admin-comic-reference-remove"
              aria-label={`Remove ${reference.label}`}
              onClick={() => removeReference(reference)}
            >
              -
            </button>
          </div>
        ))}

        <button
          type="button"
          className="admin-comic-reference-add-card"
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
        >
          <span>+</span>
          <small>Add reference</small>
        </button>
      </div>

      {referenceImages.length === 0 ? <p className="form-note">{emptyMessage}</p> : null}

      {pickerOpen ? (
        <div className="admin-comic-reference-picker">
          <div className="admin-comic-reference-picker__header">
            <strong>Add reference image</strong>
            <button
              type="button"
              className="button button--ghost button--compact"
              onClick={() => setPickerOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="admin-comic-reference-picker__tabs">
            {availableGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={
                  group.key === activeGroup
                    ? "admin-comic-reference-picker__tab is-active"
                    : "admin-comic-reference-picker__tab"
                }
                onClick={() => setActiveGroup(group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>
          <div className="admin-comic-reference-picker__list" aria-label={activeGroupLabel}>
            {activeOptions.map((reference) => {
              const referenceKey = getReferenceIdentity(reference);
              const selected = selectedKeys.has(referenceKey);

              return (
                <button
                  key={referenceKey}
                  type="button"
                  className="admin-comic-reference-option"
                  disabled={selected}
                  onClick={() => addReference(reference)}
                >
                  <Image
                    src={reference.imageUrl}
                    alt={reference.label}
                    width={72}
                    height={72}
                    unoptimized
                  />
                  <span>
                    <strong>{reference.label}</strong>
                    <small>{reference.ownerLabel || reference.fileName}</small>
                  </span>
                  <em>{selected ? "Added" : "+"}</em>
                </button>
              );
            })}
          </div>
          {autoReferenceImages.length > 0 ? (
            <p className="form-note">
              Auto originally resolved {autoReferenceImages.length} reference
              {autoReferenceImages.length === 1 ? "" : "s"} for this page.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ComicExtraPageProductionSlot({
  episodeId,
  extraPage,
  redirectTo,
  referenceImages,
  referenceLibrary,
  isReferenceOverridden,
  onReferenceChange,
  onReferenceReset,
  onRejectAsset
}: {
  episodeId: string;
  extraPage: ComicEpisodeProductionExtraPage;
  redirectTo: string;
  referenceImages: SerializedComicReferenceImage[];
  referenceLibrary: SerializedComicReferenceLibrary;
  isReferenceOverridden: boolean;
  onReferenceChange: (referenceImages: SerializedComicReferenceImage[]) => void;
  onReferenceReset: () => void;
  onRejectAsset: (assetId: string) => Promise<void>;
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
        <span className="pill">{referenceImages.length} direct refs</span>
        <span className="pill">Does not count as Page 01</span>
      </div>

      <ComicReferenceImageSelector
        referenceImages={referenceImages}
        autoReferenceImages={extraPage.referenceImages}
        referenceLibrary={referenceLibrary}
        isOverridden={isReferenceOverridden}
        emptyMessage="This insert will fall back to text-only generation unless you add a reference image."
        onChange={onReferenceChange}
        onReset={onReferenceReset}
      />

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
                  <ComicRejectAssetButton
                    assetId={asset.id}
                    label="Reject insert"
                    onRejectAsset={onRejectAsset}
                  />
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
          referenceImages={referenceImages}
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
  episodePublished,
  redirectTo: redirectToOverride,
  outlineHref
}: ComicPublishEpisodeProductionPanelProps) {
  const { tasks } = useComicImageTaskQueue();
  const episodeStatus = useComicPublishEpisodeStatus();
  const [detail, setDetail] = useState<ComicEpisodeProductionDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceSelectionOverrides, setReferenceSelectionOverrides] = useState<
    Record<string, SerializedComicReferenceImage[]>
  >({});
  const redirectTo = useMemo(
    () => redirectToOverride || buildRedirectTo(chapterId, episodeId),
    [chapterId, episodeId, redirectToOverride]
  );
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

  useEffect(() => {
    if (!detail) {
      return;
    }

    setReferenceSelectionOverrides((currentOverrides) => {
      const nextOverrides = { ...currentOverrides };
      let changed = false;
      const slotKeys = [
        ...detail.pages.map((page) => getPageReferenceSlotKey(page.pageNumber)),
        ...detail.extraPages.map((extraPage) =>
          getExtraPageReferenceSlotKey(extraPage.extraPageKey)
        )
      ];

      for (const slotKey of slotKeys) {
        if (Object.prototype.hasOwnProperty.call(nextOverrides, slotKey)) {
          continue;
        }

        const storedReferences = readStoredReferenceSelection(episodeId, slotKey);

        if (storedReferences) {
          nextOverrides[slotKey] = storedReferences;
          changed = true;
        }
      }

      return changed ? nextOverrides : currentOverrides;
    });
  }, [detail, episodeId]);

  const updateReferenceSelection = useCallback(
    (slotKey: string, referenceImages: SerializedComicReferenceImage[]) => {
      setReferenceSelectionOverrides((currentOverrides) => ({
        ...currentOverrides,
        [slotKey]: referenceImages
      }));
      writeStoredReferenceSelection(episodeId, slotKey, referenceImages);
    },
    [episodeId]
  );

  const resetReferenceSelection = useCallback(
    (slotKey: string) => {
      setReferenceSelectionOverrides((currentOverrides) => {
        const nextOverrides = { ...currentOverrides };
        delete nextOverrides[slotKey];
        return nextOverrides;
      });
      writeStoredReferenceSelection(episodeId, slotKey, null);
    },
    [episodeId]
  );

  async function handleRejectAsset(assetId: string) {
    const result = await runRejectAssetMutation(assetId);

    episodeStatus.applyMutationResult(result);

    if (result.language && typeof result.pageNumber === "number") {
      dispatchApprovalChange({
        ...result,
        language: result.language,
        pageNumber: result.pageNumber
      });
    }

    setDetail((currentDetail) =>
      currentDetail ? applyRejectedAssetResult(currentDetail, result) : currentDetail
    );
  }

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
  const selectedReferenceImagesByPageNumber: Record<number, SerializedComicReferenceImage[]> = {};

  for (const page of detail.pages) {
    const slotKey = getPageReferenceSlotKey(page.pageNumber);
    selectedReferenceImagesByPageNumber[page.pageNumber] =
      referenceSelectionOverrides[slotKey] ?? page.referenceImages;
  }

  return (
    <>
      <div className="admin-comic-publish-episode__controls">
        <div className="admin-comic-publish-episode__actions">
          <Link
            href={outlineHref || `/admin/comic/outline-studio?scope=episode&id=${episodeId}`}
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
              referenceImagesByPage={selectedReferenceImagesByPageNumber}
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
          const referenceSlotKey = getPageReferenceSlotKey(page.pageNumber);
          const isReferenceOverridden = Object.prototype.hasOwnProperty.call(
            referenceSelectionOverrides,
            referenceSlotKey
          );
          const selectedReferenceImages =
            referenceSelectionOverrides[referenceSlotKey] ?? page.referenceImages;

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
                <span className="pill">{selectedReferenceImages.length} direct refs</span>
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
                <ComicReferenceImageSelector
                  referenceImages={selectedReferenceImages}
                  autoReferenceImages={page.referenceImages}
                  referenceLibrary={detail.referenceLibrary}
                  isOverridden={isReferenceOverridden}
                  emptyMessage="This page will fall back to text-only generation unless you add a reference image."
                  onChange={(nextReferenceImages) =>
                    updateReferenceSelection(referenceSlotKey, nextReferenceImages)
                  }
                  onReset={() => resetReferenceSelection(referenceSlotKey)}
                />
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
                        <ComicRejectAssetButton
                          assetId={asset.id}
                          label="Reject image"
                          onRejectAsset={handleRejectAsset}
                        />
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
                          <ComicRejectAssetButton
                            assetId={asset.id}
                            label="Reject Chinese image"
                            onRejectAsset={handleRejectAsset}
                          />
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
                    referenceImages={selectedReferenceImages}
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
            {anchoredExtraPages.map((extraPage) => {
              const extraReferenceSlotKey = getExtraPageReferenceSlotKey(extraPage.extraPageKey);
              const isExtraReferenceOverridden = Object.prototype.hasOwnProperty.call(
                referenceSelectionOverrides,
                extraReferenceSlotKey
              );
              const selectedExtraReferenceImages =
                referenceSelectionOverrides[extraReferenceSlotKey] ?? extraPage.referenceImages;

              return (
                <ComicExtraPageProductionSlot
                  key={`${episodeId}-${extraPage.extraPageKey}`}
                  episodeId={episodeId}
                  extraPage={extraPage}
                  redirectTo={redirectTo}
                  referenceImages={selectedExtraReferenceImages}
                  referenceLibrary={detail.referenceLibrary}
                  isReferenceOverridden={isExtraReferenceOverridden}
                  onReferenceChange={(nextReferenceImages) =>
                    updateReferenceSelection(extraReferenceSlotKey, nextReferenceImages)
                  }
                  onReferenceReset={() => resetReferenceSelection(extraReferenceSlotKey)}
                  onRejectAsset={handleRejectAsset}
                />
              );
            })}
            </div>
          );
        })}
      </div>
    </>
  );
}
