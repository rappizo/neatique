import Image from "next/image";
import Link from "next/link";
import { ComicLanguageSwitcher } from "@/components/site/comic-language-switcher";
import {
  formatComicEpisodeTitle,
  getComicEpisodeHref,
  getFlattenedComicEpisodes
} from "@/lib/comic-public-navigation";
import { getComicLanguageState } from "@/lib/comic-language";
import { getPublishedComicLibrary } from "@/lib/comic-queries";

type ComicLibraryPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicLibraryPage({ searchParams }: ComicLibraryPageProps) {
  const params = await searchParams;
  const languageState = await getComicLanguageState(params);
  const seasons = await getPublishedComicLibrary(languageState.language);
  const episodes = getFlattenedComicEpisodes(seasons);
  const isChinese = languageState.language === "zh";

  return (
    <section className="section comic-library-page">
      <div className="container">
        <div className="comic-page-toolbar comic-page-toolbar--right">
          <ComicLanguageSwitcher
            basePath="/comic"
            language={languageState.language}
            show={languageState.showSwitcher}
          />
        </div>

        <header className="comic-library-header">
          <p className="eyebrow">{isChinese ? "漫画" : "Comic"}</p>
          <h1>{isChinese ? "Neatique 漫画" : "Neatique Comic"}</h1>
        </header>

        {episodes.length > 0 ? (
          <div className="comic-library-grid">
            {episodes.map((episode) => {
              const previewAsset = episode.assets[0];

              return (
                <Link
                  key={episode.id}
                  href={getComicEpisodeHref(episode, languageState.language)}
                  className="comic-library-card"
                >
                  <div className="comic-library-card__cover">
                    {previewAsset ? (
                      <Image
                        src={previewAsset.imageUrl}
                        alt={previewAsset.altText || episode.title}
                        width={600}
                        height={900}
                        sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 260px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <h2>{formatComicEpisodeTitle(episode)}</h2>
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="panel comic-empty-state">
            <h2>{isChinese ? "暂无漫画" : "No comics yet"}</h2>
            <p>
              {isChinese
                ? "已发布的漫画会显示在这里。"
                : "Published comic episodes will appear here."}
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
