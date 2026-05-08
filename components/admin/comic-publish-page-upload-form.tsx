"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { ComicChinesePageVersionQueueButton } from "@/components/admin/comic-image-task-queue";
import {
  ComicAssetApprovalControls,
  dispatchApprovalChange
} from "@/components/admin/comic-publish-approval-controls";
import {
  useComicPublishEpisodeStatus,
  type ComicPublishCenterMutationResult
} from "@/components/admin/comic-publish-episode-details";
import { formatComicPageLabel } from "@/lib/comic-pages";

type LocalUploadedComicPageAsset = {
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

type ComicPageUploadResult = ComicPublishCenterMutationResult & {
  language: "en";
  pageNumber: number;
  asset: LocalUploadedComicPageAsset;
};

type ComicPageUploadFormProps = {
  episodeId: string;
  episodeTitle: string;
  pageNumber: number;
  pagePurpose?: string | null;
  episodePublished: boolean;
};

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { message?: string; error?: string };
  return candidate.message || candidate.error || fallback;
}

function isUploadResult(payload: unknown): payload is ComicPageUploadResult {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<ComicPageUploadResult>;
  return Boolean(
    candidate.ok &&
      typeof candidate.episodeId === "string" &&
      typeof candidate.pageNumber === "number" &&
      candidate.asset &&
      typeof candidate.asset.id === "string" &&
      typeof candidate.asset.imageUrl === "string"
  );
}

function formatUploadedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Uploaded just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function UploadedPageAssetCard({
  asset
}: {
  asset: LocalUploadedComicPageAsset;
}) {
  return (
    <div className="admin-comic-publish-asset">
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
            {asset.assetType} / {formatUploadedAt(asset.createdAt)}
          </span>
        </div>
        <ComicAssetApprovalControls
          assetId={asset.id}
          episodeId={asset.episodeId}
          pageNumber={asset.sortOrder}
          language="en"
          initiallyApproved={asset.published}
        >
          <ComicChinesePageVersionQueueButton
            sourceAssetId={asset.id}
            episodeId={asset.episodeId}
            pageNumber={asset.sortOrder}
          />
        </ComicAssetApprovalControls>
        <a
          href={asset.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="button button--ghost"
        >
          View uploaded image
        </a>
      </div>
    </div>
  );
}

export function ComicPageUploadForm({
  episodeId,
  episodeTitle,
  pageNumber,
  pagePurpose,
  episodePublished
}: ComicPageUploadFormProps) {
  const episodeStatus = useComicPublishEpisodeStatus();
  const [uploadedAssets, setUploadedAssets] = useState<LocalUploadedComicPageAsset[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pageLabel = formatComicPageLabel(pageNumber);
  const fileInputId = `page-upload-${episodeId}-${pageNumber}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("comicPageFile");

    if (!(file instanceof File) || file.size <= 0) {
      setMessage("Choose an image before uploading.");
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/comic/page-upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Comic page upload failed."));
      }

      if (!isUploadResult(payload)) {
        throw new Error("Comic page upload response was incomplete.");
      }

      episodeStatus.applyMutationResult(payload);

      if (payload.approvedAssetId) {
        dispatchApprovalChange({
          ...payload,
          language: "en",
          pageNumber: payload.pageNumber
        });
      }

      setUploadedAssets((currentAssets) => [
        payload.asset,
        ...currentAssets.filter((asset) => asset.id !== payload.asset.id)
      ]);
      setMessage(
        payload.status === "page-uploaded-approved"
          ? `${pageLabel} uploaded and approved.`
          : `${pageLabel} uploaded as a draft.`
      );
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Comic page upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="admin-comic-page-upload-form" onSubmit={handleSubmit}>
      <input type="hidden" name="episodeId" value={episodeId} />
      <input type="hidden" name="pageNumber" value={pageNumber} />
      <input type="hidden" name="title" value={`${episodeTitle} - Uploaded ${pageLabel}`} />
      <input
        type="hidden"
        name="altText"
        value={`${episodeTitle} uploaded comic ${pageLabel.toLowerCase()}`}
      />
      {pagePurpose ? <input type="hidden" name="caption" value={pagePurpose} /> : null}

      <div className="admin-comic-page-upload-form__header">
        <strong>{pageLabel} Upload</strong>
        <span className="form-note">PNG, JPG, WEBP, AVIF / max 20MB</span>
      </div>
      <div className="field">
        <label htmlFor={fileInputId}>Upload edited {pageLabel.toLowerCase()}</label>
        <input
          id={fileInputId}
          type="file"
          name="comicPageFile"
          accept="image/png,image/jpeg,image/webp,image/avif"
          required
          disabled={isUploading}
        />
      </div>
      <label className="field field--checkbox">
        <input
          type="checkbox"
          name="approveAfterUpload"
          disabled={isUploading || episodePublished}
        />
        Approve after upload
      </label>
      {episodePublished ? (
        <span className="form-note">Unpublish this episode before changing approvals.</span>
      ) : null}
      <button
        type="submit"
        className="button button--secondary"
        disabled={isUploading}
        aria-busy={isUploading}
      >
        {isUploading ? "Uploading..." : `Upload ${pageLabel.toLowerCase()}`}
      </button>
      {message ? <span className="form-note">{message}</span> : null}
      {uploadedAssets.length > 0 ? (
        <div className="admin-comic-publish-assets">
          {uploadedAssets.map((asset) => (
            <UploadedPageAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : null}
    </form>
  );
}
