import Link from "next/link";
import { notFound } from "next/navigation";
import { ComicEpisodeReader } from "@/components/site/comic-episode-reader";
import { ComicLanguageSwitcher } from "@/components/site/comic-language-switcher";
import {
  formatComicEpisodeTitle,
  getAdjacentComicEpisodes,
  getComicEpisodeHref,
  getFlattenedComicEpisodes
} from "@/lib/comic-public-navigation";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";
import { getPublishedComicLibrary } from "@/lib/comic-queries";

type ComicEpisodePageProps = {
  params: Promise<{ seasonSlug: string; chapterSlug: string; episodeSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

function buildPublicEpisodeDownloadHref(episodeId: string, language: "en" | "zh") {
  return `/api/comic/episode-download?episodeId=${encodeURIComponent(episodeId)}&language=${language}`;
}

export default async function ComicEpisodePage({ params, searchParams }: ComicEpisodePageProps) {
  const { seasonSlug, chapterSlug, episodeSlug } = await params;
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);
  const [englishSeasons, chineseSeasons] = await Promise.all([
    getPublishedComicLibrary("en"),
    getPublishedComicLibrary("zh")
  ]);
  const seasons = languageState.language === "zh" ? chineseSeasons : englishSeasons;
  const episodes = getFlattenedComicEpisodes(seasons);
  const englishEpisodes = getFlattenedComicEpisodes(englishSeasons);
  const chineseEpisodes = getFlattenedComicEpisodes(chineseSeasons);
  const episode =
    episodes.find(
      (candidate) =>
        candidate.seasonSlug === seasonSlug &&
        candidate.chapterSlug === chapterSlug &&
        candidate.slug === episodeSlug
    ) || null;
  const englishEpisode =
    englishEpisodes.find(
      (candidate) =>
        candidate.seasonSlug === seasonSlug &&
        candidate.chapterSlug === chapterSlug &&
        candidate.slug === episodeSlug
    ) || null;
  const chineseEpisode =
    chineseEpisodes.find(
      (candidate) =>
        candidate.seasonSlug === seasonSlug &&
        candidate.chapterSlug === chapterSlug &&
        candidate.slug === episodeSlug
    ) || null;

  if (!episode) {
    notFound();
  }

  const { previousEpisode, nextEpisode } = getAdjacentComicEpisodes(episodes, episode);
  const isChinese = languageState.language === "zh";

  return (
    <section className="section comic-reader-page">
      <div className="container">
        <div className="stack-row comic-page-toolbar">
          <Link
            href={getComicLanguageHref("/comic", languageState.language)}
            className="button button--secondary"
          >
            {isChinese ? "返回漫画" : "Back to comics"}
          </Link>
          <ComicLanguageSwitcher
            basePath={`/comic/${seasonSlug}/${chapterSlug}/${episodeSlug}`}
            language={languageState.language}
            show={languageState.showSwitcher}
          />
          <details className="comic-download-menu">
            <summary className="button button--ghost">
              {isChinese ? "下载" : "Download"}
            </summary>
            <div className="comic-download-menu__panel">
              {englishEpisode ? (
                <a href={buildPublicEpisodeDownloadHref(englishEpisode.id, "en")}>
                  English ZIP
                </a>
              ) : (
                <span className="is-disabled">English ZIP</span>
              )}
              {chineseEpisode ? (
                <a href={buildPublicEpisodeDownloadHref(chineseEpisode.id, "zh")}>
                  中文 ZIP
                </a>
              ) : (
                <span className="is-disabled">中文 ZIP</span>
              )}
            </div>
          </details>
        </div>

        <header className="comic-reader-header">
          <p className="eyebrow">{isChinese ? "漫画" : "Comic"}</p>
          <h1>{formatComicEpisodeTitle(episode)}</h1>
        </header>

        <ComicEpisodeReader
          pages={episode.assets.map((asset) => ({
            id: asset.id,
            imageUrl: asset.imageUrl,
            altText: asset.altText || asset.title,
            title: asset.title
          }))}
          language={languageState.language}
          previousEpisodeHref={
            previousEpisode ? getComicEpisodeHref(previousEpisode, languageState.language) : undefined
          }
          previousEpisodeLabel={
            previousEpisode ? formatComicEpisodeTitle(previousEpisode) : undefined
          }
          nextEpisodeHref={
            nextEpisode ? getComicEpisodeHref(nextEpisode, languageState.language) : undefined
          }
          nextEpisodeLabel={nextEpisode ? formatComicEpisodeTitle(nextEpisode) : undefined}
        />
      </div>
    </section>
  );
}
