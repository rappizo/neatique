"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type TouchEvent } from "react";
import type { ComicLanguage } from "@/lib/comic-language";

type ComicReaderPage = {
  id: string;
  imageUrl: string;
  altText: string;
  title: string;
};

type ComicEpisodeReaderProps = {
  pages: ComicReaderPage[];
  language: ComicLanguage;
  previousEpisodeHref?: string;
  previousEpisodeLabel?: string;
  nextEpisodeHref?: string;
  nextEpisodeLabel?: string;
};

export function ComicEpisodeReader({
  pages,
  language,
  previousEpisodeHref,
  previousEpisodeLabel,
  nextEpisodeHref,
  nextEpisodeLabel
}: ComicEpisodeReaderProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const currentPage = pages[currentIndex];
  const isChinese = language === "zh";

  function goToPreviousPage() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return;
    }

    if (previousEpisodeHref) {
      router.push(previousEpisodeHref);
    }
  }

  function goToNextPage() {
    if (currentIndex < pages.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    if (nextEpisodeHref) {
      router.push(nextEpisodeHref);
    }
  }

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

  if (!currentPage) {
    return null;
  }

  return (
    <div className="comic-reader-shell">
      <div
        className="comic-reader-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          key={currentPage.id}
          src={currentPage.imageUrl}
          alt={currentPage.altText || currentPage.title}
          width={1200}
          height={1800}
          className="comic-reader-image"
          priority
          unoptimized
        />
      </div>

      <div className="comic-reader-pagination" aria-label={isChinese ? "漫画页码" : "Comic pages"}>
        {previousEpisodeHref ? (
          <Link
            href={previousEpisodeHref}
            className="comic-reader-episode-link"
            title={previousEpisodeLabel}
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
              onClick={() => setCurrentIndex(index)}
              aria-current={index === currentIndex ? "page" : undefined}
              aria-label={`${isChinese ? "第" : "Page "} ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {nextEpisodeHref ? (
          <Link href={nextEpisodeHref} className="comic-reader-episode-link" title={nextEpisodeLabel}>
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
