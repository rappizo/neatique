import Link from "next/link";
import { ComicLanguageSwitcher } from "@/components/site/comic-language-switcher";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";
import { getPublishedComicLibrary } from "@/lib/comic-queries";

type ComicLibraryPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicLibraryPage({ searchParams }: ComicLibraryPageProps) {
  const params = await searchParams;
  const languageState = await getComicLanguageState(params);
  const seasons = await getPublishedComicLibrary(languageState.language);
  const isChinese = languageState.language === "zh";

  return (
    <section className="section">
      <div className="container">
        {languageState.showSwitcher ? (
          <div className="stack-row comic-page-toolbar comic-page-toolbar--right">
            <ComicLanguageSwitcher
              basePath="/comic"
              language={languageState.language}
              show={languageState.showSwitcher}
            />
          </div>
        ) : null}

        <div className="page-hero">
          <p className="eyebrow">{isChinese ? "漫画" : "Comic"}</p>
          <h1>
            {isChinese
              ? "按季、章节和集数阅读 Neatique 漫画。"
              : "Read the published comic universe by season, chapter, and episode."}
          </h1>
          <p>
            {isChinese
              ? "这里仅展示已经完成并发布的漫画内容。草稿、未完成章节和未发布集数会继续隐藏。"
              : "This library only shows finished, published comic episodes. Draft seasons, unfinished chapters, and unpublished episodes stay hidden until they are ready."}
          </p>
          <div className="page-hero__stats">
            <span className="pill">
              {seasons.length} {isChinese ? "个已发布季" : "published seasons"}
            </span>
            <span className="pill">
              {seasons.reduce((sum, season) => sum + season.chapters.length, 0)}{" "}
              {isChinese ? "个已发布章节" : "published chapters"}
            </span>
            <span className="pill">
              {seasons.reduce(
                (sum, season) => sum + season.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.episodes.length, 0),
                0
              )}{" "}
              {isChinese ? "集已发布" : "published episodes"}
            </span>
          </div>
        </div>

        {seasons.length > 0 ? (
          <div className="comic-grid comic-grid--seasons">
            {seasons.map((season) => (
              <article key={season.id} className="panel comic-card">
                <p className="eyebrow">Season {season.seasonNumber}</p>
                <h2>{season.title}</h2>
                <p>{season.summary}</p>
                <div className="stack-row">
                  <span className="pill">
                    {season.chapters.length} {isChinese ? "章" : "chapters"}
                  </span>
                  <span className="pill">
                    {season.chapters.reduce((sum, chapter) => sum + chapter.episodes.length, 0)}{" "}
                    {isChinese ? "集" : "episodes"}
                  </span>
                </div>
                <div className="stack-row">
                  <Link
                    href={getComicLanguageHref(`/comic/${season.slug}`, languageState.language)}
                    className="button button--primary"
                  >
                    {isChinese ? "打开本季" : "Open season"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="panel">
            <h2>{isChinese ? "暂无已发布漫画内容" : "No published comic content yet"}</h2>
            <p>
              {isChinese
                ? "漫画库已经准备好。后台发布完成后，集数会显示在这里。"
                : "The comic library is live and ready. Episodes will appear here once they are published from the admin comic workflow."}
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
