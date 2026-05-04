"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SyntheticEvent
} from "react";

export type ComicPublishLanguage = "en" | "zh";

export type ComicPublishCenterMutationResult = {
  ok: boolean;
  status: string;
  message?: string;
  episodeId: string;
  episodePublished: boolean;
  englishApprovedCount: number;
  chineseApprovedCount: number;
  requiredPageCount: number;
  canPublish: boolean;
  canPublishChinese: boolean;
  language?: ComicPublishLanguage;
  pageNumber?: number;
  assetId?: string;
  approvedAssetId?: string | null;
  approvedChineseAssetId?: string | null;
};

type ComicPublishEpisodeStatusContextValue = {
  episodeId: string;
  published: boolean;
  englishApprovedCount: number;
  chineseApprovedCount: number;
  requiredPageCount: number;
  canPublish: boolean;
  canPublishChinese: boolean;
  applyMutationResult: (result: ComicPublishCenterMutationResult) => void;
};

const ComicPublishEpisodeStatusContext =
  createContext<ComicPublishEpisodeStatusContextValue | null>(null);

export function useComicPublishEpisodeStatus() {
  const context = useContext(ComicPublishEpisodeStatusContext);

  if (!context) {
    throw new Error("useComicPublishEpisodeStatus must be used inside ComicPublishEpisodeDetails.");
  }

  return context;
}

type ComicPublishEpisodeDetailsProps = {
  id: string;
  storageKey: string;
  episodeNumber: number;
  title: string;
  summary: string;
  published: boolean;
  englishApprovedCount: number;
  chineseApprovedCount: number;
  requiredPageCount: number;
  draftPageCount: number;
  hasPromptPackage: boolean;
  promptReadyCount?: number;
  promptIssueCount?: number;
  promptWarningCount?: number;
  children: ReactNode;
};

export function ComicPublishEpisodeDetails({
  id,
  storageKey,
  episodeNumber,
  title,
  summary,
  published,
  englishApprovedCount,
  chineseApprovedCount,
  requiredPageCount,
  draftPageCount,
  hasPromptPackage,
  promptReadyCount,
  promptIssueCount,
  promptWarningCount,
  children
}: ComicPublishEpisodeDetailsProps) {
  const [open, setOpen] = useState(true);
  const [publishedState, setPublishedState] = useState(published);
  const [englishApprovedCountState, setEnglishApprovedCountState] =
    useState(englishApprovedCount);
  const [chineseApprovedCountState, setChineseApprovedCountState] =
    useState(chineseApprovedCount);
  const [requiredPageCountState, setRequiredPageCountState] = useState(requiredPageCount);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);

    if (storedValue === "closed") {
      setOpen(false);
    } else if (storedValue === "open") {
      setOpen(true);
    }
  }, [storageKey]);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const nextOpen = event.currentTarget.open;

    setOpen(nextOpen);
    window.localStorage.setItem(storageKey, nextOpen ? "open" : "closed");
  }

  const contextValue = useMemo<ComicPublishEpisodeStatusContextValue>(
    () => ({
      episodeId: id.replace(/^episode-/, ""),
      published: publishedState,
      englishApprovedCount: englishApprovedCountState,
      chineseApprovedCount: chineseApprovedCountState,
      requiredPageCount: requiredPageCountState,
      canPublish: englishApprovedCountState >= requiredPageCountState,
      canPublishChinese: chineseApprovedCountState >= requiredPageCountState,
      applyMutationResult: (result) => {
        if (`episode-${result.episodeId}` !== id) {
          return;
        }

        setPublishedState(result.episodePublished);
        setEnglishApprovedCountState(result.englishApprovedCount);
        setChineseApprovedCountState(result.chineseApprovedCount);
        setRequiredPageCountState(result.requiredPageCount);
      }
    }),
    [
      id,
      publishedState,
      englishApprovedCountState,
      chineseApprovedCountState,
      requiredPageCountState
    ]
  );

  return (
    <ComicPublishEpisodeStatusContext.Provider value={contextValue}>
      <details
        id={id}
        className="admin-form admin-comic-publish-episode"
        open={open}
        onToggle={handleToggle}
      >
        <summary className="admin-comic-publish-episode-summary">
          <span className="admin-comic-publish-episode-summary__marker" aria-hidden="true" />
          <div className="admin-comic-publish-episode-summary__copy">
            <p className="eyebrow">
              Episode {episodeNumber} / {publishedState ? "Published" : "Draft"}
            </p>
            <h2>{title}</h2>
            <p className="form-note">{summary || "No episode summary yet."}</p>
          </div>
          <div className="admin-comic-publish-episode-summary__meta">
            <span className="pill">
              English {englishApprovedCountState} / {requiredPageCountState}
            </span>
            <span className="pill">
              Chinese {chineseApprovedCountState} / {requiredPageCountState}
            </span>
            <span className="pill">{draftPageCount} draft images</span>
            <span className="pill">
              {hasPromptPackage ? "10-page prompts loaded" : "No prompts yet"}
            </span>
            {typeof promptReadyCount === "number" ? (
              <span
                className={
                  promptIssueCount
                    ? "pill pill--danger"
                    : promptWarningCount
                      ? "pill pill--warning"
                      : "pill pill--success"
                }
              >
                {promptIssueCount
                  ? `Prompt QA ${promptIssueCount} issue${promptIssueCount === 1 ? "" : "s"}`
                  : promptWarningCount
                    ? `Prompt QA ${promptWarningCount} warning${promptWarningCount === 1 ? "" : "s"}`
                    : `Prompt QA ${promptReadyCount} / ${requiredPageCountState}`}
              </span>
            ) : null}
          </div>
        </summary>
        <div className="admin-comic-publish-episode__body">{children}</div>
      </details>
    </ComicPublishEpisodeStatusContext.Provider>
  );
}
