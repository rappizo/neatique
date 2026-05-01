import Link from "next/link";
import { notFound } from "next/navigation";
import { ComicLanguageSwitcher } from "@/components/site/comic-language-switcher";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";
import { getPublishedComicChapterBySlugs } from "@/lib/comic-queries";

type ComicChapterPageProps = {
  params: Promise<{ seasonSlug: string; chapterSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicChapterPage({ params, searchParams }: ComicChapterPageProps) {
  const { seasonSlug, chapterSlug } = await params;
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);
  const chapter = await getPublishedComicChapterBySlugs(
    seasonSlug,
    chapterSlug,
    languageState.language
  );
  const isChinese = languageState.language === "zh";

  if (!chapter) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="stack-row comic-page-toolbar">
          <Link
            href={getComicLanguageHref(`/comic/${seasonSlug}`, languageState.language)}
            className="button button--secondary"
          >
            {isChinese ? "返回本季" : "Back to season"}
          </Link>
          <ComicLanguageSwitcher
            basePath={`/comic/${seasonSlug}/${chapterSlug}`}
            language={languageState.language}
            show={languageState.showSwitcher}
          />
        </div>

        <div className="page-hero">
          <p className="eyebrow">
            Season / Chapter {chapter.chapterNumber}
          </p>
          <h1>{chapter.title}</h1>
          <p>{chapter.summary}</p>
          <div className="page-hero__stats">
            <span className="pill">
              {chapter.episodes.length} {isChinese ? "集已发布" : "published episodes"}
            </span>
          </div>
        </div>

        <div className="comic-grid comic-grid--episodes">
          {chapter.episodes.map((episode) => (
            <article key={episode.id} className="panel comic-card comic-card--episode">
              {episode.coverImageUrl ? (
                <Link
                  href={getComicLanguageHref(
                    `/comic/${seasonSlug}/${chapterSlug}/${episode.slug}`,
                    languageState.language
                  )}
                  className="comic-card__image-link"
                >
                  <div className="comic-card__cover">
                    <img
                      src={episode.coverImageUrl}
                      alt={episode.coverImageAlt || episode.title}
                      loading="lazy"
                    />
                  </div>
                </Link>
              ) : episode.assets[0] ? (
                <Link
                  href={getComicLanguageHref(
                    `/comic/${seasonSlug}/${chapterSlug}/${episode.slug}`,
                    languageState.language
                  )}
                  className="comic-card__image-link"
                >
                  <div className="comic-card__cover">
                    <img
                      src={episode.assets[0].imageUrl}
                      alt={episode.assets[0].altText || episode.title}
                      loading="lazy"
                    />
                  </div>
                </Link>
              ) : null}
              <div className="comic-card__body">
                <p className="eyebrow">Episode {episode.episodeNumber}</p>
                <h2>{episode.title}</h2>
                <p>{episode.summary}</p>
                <div className="stack-row">
                  <span className="pill">
                    {episode.assets.length} {isChinese ? "页漫画" : "comic pages"}
                  </span>
                </div>
                <div className="stack-row">
                  <Link
                    href={getComicLanguageHref(
                      `/comic/${seasonSlug}/${chapterSlug}/${episode.slug}`,
                      languageState.language
                    )}
                    className="button button--primary"
                  >
                    {isChinese ? "阅读本集" : "Read episode"}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
