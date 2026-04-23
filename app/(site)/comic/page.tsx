import Link from "next/link";
import { getPublishedComicLibrary } from "@/lib/queries";

export default async function ComicLibraryPage() {
  const seasons = await getPublishedComicLibrary();

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Comic</p>
          <h1>Read the published comic universe by season, chapter, and episode.</h1>
          <p>
            This library only shows finished, published comic episodes. Draft seasons, unfinished
            chapters, and unpublished episodes stay hidden until they are ready.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{seasons.length} published seasons</span>
            <span className="pill">
              {seasons.reduce((sum, season) => sum + season.chapters.length, 0)} published chapters
            </span>
            <span className="pill">
              {seasons.reduce(
                (sum, season) => sum + season.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.episodes.length, 0),
                0
              )}{" "}
              published episodes
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
                  <span className="pill">{season.chapters.length} chapters</span>
                  <span className="pill">
                    {season.chapters.reduce((sum, chapter) => sum + chapter.episodes.length, 0)} episodes
                  </span>
                </div>
                <div className="stack-row">
                  <Link href={`/comic/${season.slug}`} className="button button--primary">
                    Open season
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="panel">
            <h2>No published comic content yet</h2>
            <p>
              The comic library is live and ready. Episodes will appear here once they are
              published from the admin comic workflow.
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
