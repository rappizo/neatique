"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent
} from "react";
import type { ComicLanguage } from "@/lib/comic-language";

type ComicReaderPage = {
  id: string;
  imageUrl: string;
  altText: string;
  title: string;
};

type ComicReaderFitMode = "page" | "width";

type ComicEpisodeReaderProps = {
  episodeId: string;
  pages: ComicReaderPage[];
  language: ComicLanguage;
  previousEpisodeHref?: string;
  previousEpisodeLabel?: string;
  nextEpisodeHref?: string;
  nextEpisodeLabel?: string;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

export function ComicEpisodeReader({
  episodeId,
  pages,
  language,
  previousEpisodeHref,
  previousEpisodeLabel,
  nextEpisodeHref,
  nextEpisodeLabel
}: ComicEpisodeReaderProps) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [fitMode, setFitMode] = useState<ComicReaderFitMode>("page");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentPage = pages[currentIndex];
  const isChinese = language === "zh";
  const progressKey = useMemo(
    () => `neatique:comic-reader:${episodeId}:${language}:page`,
    [episodeId, language]
  );
  const canGoPrevious = currentIndex > 0 || Boolean(previousEpisodeHref);
  const canGoNext = currentIndex < pages.length - 1 || Boolean(nextEpisodeHref);

  const keepScrollAfterUpdate = useCallback((update: () => void) => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    update();
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    });
  }, []);

  const goToPage = useCallback(
    (index: number) => {
      if (index === currentIndex || index < 0 || index >= pages.length) {
        return;
      }

      keepScrollAfterUpdate(() => setCurrentIndex(index));
    },
    [currentIndex, keepScrollAfterUpdate, pages.length]
  );

  const goToPreviousPage = useCallback(() => {
    if (currentIndex > 0) {
      goToPage(currentIndex - 1);
      return;
    }

    if (previousEpisodeHref) {
      router.push(previousEpisodeHref, { scroll: false });
    }
  }, [currentIndex, goToPage, previousEpisodeHref, router]);

  const goToNextPage = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      goToPage(currentIndex + 1);
      return;
    }

    if (nextEpisodeHref) {
      router.push(nextEpisodeHref, { scroll: false });
    }
  }, [currentIndex, goToPage, nextEpisodeHref, pages.length, router]);

  useEffect(() => {
    const savedIndex = Number.parseInt(window.localStorage.getItem(progressKey) || "", 10);

    if (Number.isFinite(savedIndex) && savedIndex >= 0 && savedIndex < pages.length) {
      setCurrentIndex(savedIndex);
    }
  }, [pages.length, progressKey]);

  useEffect(() => {
    window.localStorage.setItem(progressKey, String(currentIndex));
  }, [currentIndex, progressKey]);

  useEffect(() => {
    const adjacentPages = [pages[currentIndex - 1], pages[currentIndex + 1]].filter(
      (page): page is ComicReaderPage => Boolean(page)
    );

    for (const page of adjacentPages) {
      const image = new window.Image();
      image.src = page.imageUrl;
    }
  }, [currentIndex, pages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousPage();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextPage();
      }

      if (event.key === "Home") {
        event.preventDefault();
        goToPage(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        goToPage(pages.length - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextPage, goToPage, goToPreviousPage, pages.length]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = touchStartX - endX;
    setTouchStartX(null);

    if (Math.abs(deltaX) < 44) {
      return;
    }

    if (deltaX > 0) {
      goToNextPage();
    } else {
      goToPreviousPage();
    }
  }

  async function toggleFullscreen() {
    if (!stageRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await stageRef.current.requestFullscreen();
  }

  if (!currentPage) {
    return null;
  }

  return (
    <div className="comic-reader-shell">
      <div className="comic-reader-controls" aria-label={isChinese ? "阅读设置" : "Reader settings"}>
        <div className="comic-reader-progress">
          <span>
            {isChinese ? "第" : "Page"} {currentIndex + 1} / {pages.length}
          </span>
          <progress value={currentIndex + 1} max={pages.length} />
        </div>
        <div className="comic-reader-control-group">
          <button
            type="button"
            className={fitMode === "page" ? "is-active" : undefined}
            onClick={() => setFitMode("page")}
            aria-pressed={fitMode === "page"}
          >
            {isChinese ? "整页" : "Page"}
          </button>
          <button
            type="button"
            className={fitMode === "width" ? "is-active" : undefined}
            onClick={() => setFitMode("width")}
            aria-pressed={fitMode === "width"}
          >
            {isChinese ? "宽度" : "Width"}
          </button>
          <button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen}>
            {isFullscreen ? (isChinese ? "退出" : "Exit") : isChinese ? "全屏" : "Full"}
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`comic-reader-stage comic-reader-stage--fit-${fitMode}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <NextImage
          src={currentPage.imageUrl}
          alt={currentPage.altText || currentPage.title}
          width={1200}
          height={1800}
          className="comic-reader-image"
          priority
          unoptimized
        />
        <button
          type="button"
          className="comic-reader-arrow comic-reader-arrow--prev"
          onClick={goToPreviousPage}
          disabled={!canGoPrevious}
          aria-label={isChinese ? "上一页" : "Previous page"}
        >
          ‹
        </button>
        <button
          type="button"
          className="comic-reader-arrow comic-reader-arrow--next"
          onClick={goToNextPage}
          disabled={!canGoNext}
          aria-label={isChinese ? "下一页" : "Next page"}
        >
          ›
        </button>
      </div>

      <div className="comic-reader-pagination" aria-label={isChinese ? "漫画页码" : "Comic pages"}>
        {previousEpisodeHref ? (
          <Link
            href={previousEpisodeHref}
            className="comic-reader-episode-link"
            title={previousEpisodeLabel}
            scroll={false}
          >
            {isChinese ? "上一话" : "Prev"}
          </Link>
        ) : (
          <span className="comic-reader-episode-link is-disabled">
            {isChinese ? "上一话" : "Prev"}
          </span>
        )}

        <div className="comic-reader-page-buttons">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              className={index === currentIndex ? "is-active" : undefined}
              onClick={() => goToPage(index)}
              aria-current={index === currentIndex ? "page" : undefined}
              aria-label={`${isChinese ? "第" : "Page"} ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {nextEpisodeHref ? (
          <Link
            href={nextEpisodeHref}
            className="comic-reader-episode-link"
            title={nextEpisodeLabel}
            scroll={false}
          >
            {isChinese ? "下一话" : "Next"}
          </Link>
        ) : (
          <span className="comic-reader-episode-link is-disabled">
            {isChinese ? "下一话" : "Next"}
          </span>
        )}
      </div>
    </div>
  );
}
