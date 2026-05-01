"use client";

import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";

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
  children
}: ComicPublishEpisodeDetailsProps) {
  const [open, setOpen] = useState(true);

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

  return (
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
            Episode {episodeNumber} / {published ? "Published" : "Draft"}
          </p>
          <h2>{title}</h2>
          <p className="form-note">{summary || "No episode summary yet."}</p>
        </div>
        <div className="admin-comic-publish-episode-summary__meta">
          <span className="pill">English {englishApprovedCount} / {requiredPageCount}</span>
          <span className="pill">Chinese {chineseApprovedCount} / {requiredPageCount}</span>
          <span className="pill">{draftPageCount} draft images</span>
          <span className="pill">{hasPromptPackage ? "10-page prompts loaded" : "No prompts yet"}</span>
        </div>
      </summary>
      <div className="admin-comic-publish-episode__body">{children}</div>
    </details>
  );
}
