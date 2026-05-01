import Link from "next/link";
import { notFound } from "next/navigation";
import { ComicLanguageSwitcher } from "@/components/site/comic-language-switcher";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";
import { getPublishedComicSeasonBySlug } from "@/lib/comic-queries";

type ComicSeasonPageProps = {
  params: Promise<{ seasonSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicSeasonPage({ params, searchParams }: ComicSeasonPageProps) {
  const { seasonSlug } = await params;
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);
  const season = await getPublishedComicSeasonBySlug(seasonSlug, languageState.language);
  const isChinese = languageState.language === "zh";

  if (!season) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="stack-row comic-page-toolbar">
          <Link
            href={getComicLanguageHref("/comic", languageState.language)}
            className="button button--secondary"
          >
            {isChinese ? "返回漫画库" : "Back to comic"}
          </Link>
          <ComicLanguageSwitcher
            basePath={`/comic/${seasonSlug}`}
            language={languageState.language}
            show={languageState.showSwitcher}
          />
        </div>

        <div className="page-hero">
          <p className="eyebrow">Season {season.seasonNumber}</p>
          <h1>{season.title}</h1>
          <p>{season.summary}</p>
          <div className="page-hero__stats">
            <span className="pill">
              {season.chapters.length} {isChinese ? "个已发布章节" : "published chapters"}
            </span>
            <span className="pill">
              {season.chapters.reduce((sum, chapter) => sum + chapter.episodes.length, 0)}{" "}
              {isChinese ? "集已发布" : "published episodes"}
            </span>
          </div>
        </div>

        <div className="comic-grid comic-grid--chapters">
          {season.chapters.map((chapter) => (
            <article key={chapter.id} className="panel comic-card">
              <p className="eyebrow">Chapter {chapter.chapterNumber}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.summary}</p>
              <div className="stack-row">
                <span className="pill">
                  {chapter.episodes.length} {isChinese ? "集" : "episodes"}
                </span>
              </div>
              <div className="stack-row">
                <Link
                  href={getComicLanguageHref(
                    `/comic/${season.slug}/${chapter.slug}`,
                    languageState.language
                  )}
                  className="button button--primary"
                >
                  {isChinese ? "打开章节" : "Open chapter"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
