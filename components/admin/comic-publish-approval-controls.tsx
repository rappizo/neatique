"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import {
  useComicPublishEpisodeStatus,
  type ComicPublishCenterMutationResult,
  type ComicPublishLanguage
} from "@/components/admin/comic-publish-episode-details";

const APPROVAL_CHANGE_EVENT = "neatique:comic-publish-approval-change";

type AssetApprovalChangeDetail = ComicPublishCenterMutationResult & {
  language: ComicPublishLanguage;
  pageNumber: number;
};

type ComicAssetApprovalControlsProps = {
  assetId: string;
  episodeId: string;
  pageNumber: number;
  language: ComicPublishLanguage;
  initiallyApproved: boolean;
  children?: ReactNode;
};

type ComicEpisodePublishControlsProps = {
  episodeId: string;
};

type ComicEpisodeDownloadMenuProps = {
  englishHref: string;
  chineseHref: string;
};

type ComicPublishPageStateProps = {
  episodeId: string;
  pageNumber: number;
  initiallyApproved: boolean;
  children?: ReactNode;
};

type ComicPublishPageHeaderStatusProps = {
  episodeId: string;
  pageNumber: number;
  initiallyApproved: boolean;
  hasDraftAssets: boolean;
};

type ComicChinesePageStatusProps = {
  episodeId: string;
  pageNumber: number;
  initiallyChineseApproved: boolean;
  hasChineseAssets: boolean;
};

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { message?: string; error?: string };
  return candidate.message || candidate.error || fallback;
}

async function runPublishCenterMutation(input: {
  intent:
    | "approve-asset"
    | "unapprove-asset"
    | "approve-chinese-asset"
    | "unapprove-chinese-asset"
    | "publish-episode"
    | "unpublish-episode";
  assetId?: string;
  episodeId?: string;
}) {
  const response = await fetch("/api/admin/comic/publish-center", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Comic publish center action failed."));
  }

  return payload as ComicPublishCenterMutationResult;
}

function dispatchApprovalChange(detail: AssetApprovalChangeDetail) {
  window.dispatchEvent(
    new CustomEvent<AssetApprovalChangeDetail>(APPROVAL_CHANGE_EVENT, {
      detail
    })
  );
}

function getAssetStatusClass(approved: boolean) {
  return approved
    ? "admin-table__status-badge admin-table__status-badge--success"
    : "admin-table__status-badge admin-table__status-badge--warning";
}

function usePageApprovalState(input: {
  episodeId: string;
  pageNumber: number;
  initiallyApproved?: boolean;
  initiallyChineseApproved?: boolean;
}) {
  const [approved, setApproved] = useState(Boolean(input.initiallyApproved));
  const [chineseApproved, setChineseApproved] = useState(
    Boolean(input.initiallyChineseApproved)
  );

  useEffect(() => {
    function handleApprovalChange(event: Event) {
      const detail = (event as CustomEvent<AssetApprovalChangeDetail>).detail;

      if (
        !detail ||
        detail.episodeId !== input.episodeId ||
        detail.pageNumber !== input.pageNumber
      ) {
        return;
      }

      if (detail.language === "en") {
        setApproved(Boolean(detail.approvedAssetId));

        if (detail.approvedChineseAssetId === null) {
          setChineseApproved(false);
        }
      }

      if (detail.language === "zh") {
        setChineseApproved(Boolean(detail.approvedChineseAssetId));
      }
    }

    window.addEventListener(APPROVAL_CHANGE_EVENT, handleApprovalChange);

    return () => {
      window.removeEventListener(APPROVAL_CHANGE_EVENT, handleApprovalChange);
    };
  }, [input.episodeId, input.pageNumber]);

  return {
    approved,
    chineseApproved
  };
}

export function ComicPublishPageArticle({
  episodeId,
  pageNumber,
  initiallyApproved,
  children
}: ComicPublishPageStateProps) {
  const { approved } = usePageApprovalState({
    episodeId,
    pageNumber,
    initiallyApproved
  });

  return (
    <article
      className={
        approved ? "admin-comic-publish-page is-approved" : "admin-comic-publish-page"
      }
    >
      {children}
    </article>
  );
}

export function ComicPublishPageHeaderStatus({
  episodeId,
  pageNumber,
  initiallyApproved,
  hasDraftAssets
}: ComicPublishPageHeaderStatusProps) {
  const { approved } = usePageApprovalState({
    episodeId,
    pageNumber,
    initiallyApproved
  });
  const pageStatus = approved ? "Approved" : hasDraftAssets ? "Needs approval" : "Needs image";

  return <span className={getAssetStatusClass(approved)}>{pageStatus}</span>;
}

export function ComicChinesePageStatusPill({
  episodeId,
  pageNumber,
  initiallyChineseApproved,
  hasChineseAssets
}: ComicChinesePageStatusProps) {
  const { chineseApproved } = usePageApprovalState({
    episodeId,
    pageNumber,
    initiallyChineseApproved
  });

  if (chineseApproved) {
    return <span className="pill">Chinese approved</span>;
  }

  if (hasChineseAssets) {
    return <span className="pill">Chinese draft ready</span>;
  }

  return null;
}

export function ComicChineseApprovalHeadingPill({
  episodeId,
  pageNumber,
  initiallyChineseApproved,
  hasChineseAssets
}: ComicChinesePageStatusProps) {
  const { chineseApproved } = usePageApprovalState({
    episodeId,
    pageNumber,
    initiallyChineseApproved
  });

  if (!hasChineseAssets) {
    return null;
  }

  return <span className="pill">{chineseApproved ? "1 approved" : "Approval needed"}</span>;
}

export function ComicAssetApprovalControls({
  assetId,
  episodeId,
  pageNumber,
  language,
  initiallyApproved,
  children
}: ComicAssetApprovalControlsProps) {
  const episodeStatus = useComicPublishEpisodeStatus();
  const [approved, setApproved] = useState(initiallyApproved);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isChinese = language === "zh";
  const approvalLocked = episodeStatus.published;

  useEffect(() => {
    function handleApprovalChange(event: Event) {
      const detail = (event as CustomEvent<AssetApprovalChangeDetail>).detail;

      if (!detail || detail.episodeId !== episodeId || detail.pageNumber !== pageNumber) {
        return;
      }

      if (language === "en" && detail.language === "en") {
        setApproved(detail.approvedAssetId === assetId);
      }

      if (language === "zh") {
        if (detail.language === "zh") {
          setApproved(detail.approvedChineseAssetId === assetId);
        }

        if (detail.language === "en" && detail.approvedChineseAssetId === null) {
          setApproved(false);
        }
      }
    }

    window.addEventListener(APPROVAL_CHANGE_EVENT, handleApprovalChange);

    return () => {
      window.removeEventListener(APPROVAL_CHANGE_EVENT, handleApprovalChange);
    };
  }, [assetId, episodeId, language, pageNumber]);

  function runApprovalAction() {
    startTransition(async () => {
      setMessage(null);

      try {
        const result = await runPublishCenterMutation({
          intent: isChinese
            ? approved
              ? "unapprove-chinese-asset"
              : "approve-chinese-asset"
            : approved
              ? "unapprove-asset"
              : "approve-asset",
          assetId
        });

        episodeStatus.applyMutationResult(result);

        if (typeof result.pageNumber === "number" && result.language) {
          dispatchApprovalChange({
            ...result,
            language: result.language,
            pageNumber: result.pageNumber
          });
        }

        setMessage(
          approved
            ? isChinese
              ? "Chinese approval removed"
              : "Approval removed"
            : isChinese
              ? "Chinese approved"
              : "Approved"
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Comic page approval update failed."
        );
      }
    });
  }

  return (
    <>
      <span className={getAssetStatusClass(approved)}>
        {isChinese ? (approved ? "Chinese Approved" : "Chinese Draft") : approved ? "Approved" : "Draft"}
      </span>
      <button
        type="button"
        className={approved ? "button button--ghost" : "button button--primary"}
        onClick={runApprovalAction}
        disabled={isPending || approvalLocked}
        aria-busy={isPending}
        title={approvalLocked ? "Unpublish this episode before changing approvals." : undefined}
      >
        {isPending
          ? "Saving..."
          : approvalLocked
            ? "Unpublish to edit"
            : isChinese
              ? approved
                ? "Remove Chinese approval"
                : "Approve Chinese version"
              : approved
                ? "Remove approval"
                : "Approve this page"}
      </button>
      {message ? <span className="form-note">{message}</span> : null}
      {approved ? children : null}
    </>
  );
}

export function ComicEpisodePublishControls({ episodeId }: ComicEpisodePublishControlsProps) {
  const episodeStatus = useComicPublishEpisodeStatus();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canPublish = episodeStatus.canPublish;

  function runEpisodeAction(intent: "publish-episode" | "unpublish-episode") {
    startTransition(async () => {
      setMessage(null);

      try {
        const result = await runPublishCenterMutation({
          intent,
          episodeId
        });

        episodeStatus.applyMutationResult(result);
        setMessage(intent === "publish-episode" ? "Published" : "Unpublished");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Comic episode publish update failed."
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="button button--primary"
        onClick={() => runEpisodeAction("publish-episode")}
        disabled={isPending || !canPublish}
        aria-busy={isPending}
        title={!canPublish ? "Approve pages 1-10 before publishing this episode." : undefined}
      >
        {isPending
          ? "Publishing..."
          : episodeStatus.published
            ? "Refresh public episode"
            : "Publish episode"}
      </button>
      {episodeStatus.published ? (
        <button
          type="button"
          className="button button--ghost"
          onClick={() => runEpisodeAction("unpublish-episode")}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Unpublish episode"}
        </button>
      ) : null}
      {message ? <span className="form-note">{message}</span> : null}
    </>
  );
}

export function ComicEpisodeDownloadMenu({
  englishHref,
  chineseHref
}: ComicEpisodeDownloadMenuProps) {
  const episodeStatus = useComicPublishEpisodeStatus();

  return (
    <details className="admin-comic-download-menu">
      <summary className="button button--ghost">Download</summary>
      <div className="admin-comic-download-menu__panel">
        {episodeStatus.canPublish ? (
          <a href={englishHref}>English ZIP</a>
        ) : (
          <span className="is-disabled">
            English ZIP ({episodeStatus.englishApprovedCount}/{episodeStatus.requiredPageCount})
          </span>
        )}
        {episodeStatus.canPublishChinese ? (
          <a href={chineseHref}>Chinese ZIP</a>
        ) : (
          <span className="is-disabled">
            Chinese ZIP ({episodeStatus.chineseApprovedCount}/{episodeStatus.requiredPageCount})
          </span>
        )}
      </div>
    </details>
  );
}
