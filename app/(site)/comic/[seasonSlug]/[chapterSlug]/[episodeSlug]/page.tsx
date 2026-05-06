import type { Metadata } from "next";
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
import {
  getPublishedComicEpisodeBySlugs,
  getPublishedComicLibrary
} from "@/lib/comic-queries";
import { defaultOgImage, toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type ComicEpisodePageProps = {
  params: Promise<{ seasonSlug: string; chapterSlug: string; episodeSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

function buildPublicEpisodeDownloadHref(episodeId: string, language: "en" | "zh") {
  return `/api/comic/episode-download?episodeId=${encodeURIComponent(episodeId)}&language=${language}`;
}

function buildComicEpisodePath(seasonSlug: string, chapterSlug: string, episodeSlug: string) {
  return `/comic/${seasonSlug}/${chapterSlug}/${episodeSlug}`;
}

function safeAbsoluteComicImageUrl(path: string | null | undefined) {
  try {
    return toAbsoluteUrl(path || defaultOgImage.url);
  } catch {
    return toAbsoluteUrl(defaultOgImage.url);
  }
}

export async function generateMetadata({
  params,
  searchParams
}: ComicEpisodePageProps): Promise<Metadata> {
  const { seasonSlug, chapterSlug, episodeSlug } = await params;
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);
  const episode = await getPublishedComicEpisodeBySlugs(
    seasonSlug,
    chapterSlug,
    episodeSlug,
    languageState.language
  );

  if (!episode) {
    return {
      title: "Comic not found"
    };
  }

  const canonicalPath = getComicLanguageHref(
    buildComicEpisodePath(seasonSlug, chapterSlug, episodeSlug),
    languageState.language
  );
  const previewAsset = episode.assets[0] || null;
  const previewImageUrl = safeAbsoluteComicImageUrl(previewAsset?.imageUrl);
  const previewImageAlt = previewAsset?.altText || previewAsset?.title || episode.title;

  return {
    title: episode.title,
    description: episode.summary,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      type: "article",
      title: episode.title,
      description: episode.summary,
      url: toAbsoluteUrl(canonicalPath),
      siteName: siteConfig.title,
      images: [
        {
          url: previewImageUrl,
          alt: previewImageAlt
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: episode.title,
      description: episode.summary,
      images: [previewImageUrl]
    }
  };
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
          episodeId={episode.id}
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
