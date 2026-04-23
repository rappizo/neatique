import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedComicSeasonBySlug } from "@/lib/queries";

type ComicSeasonPageProps = {
  params: Promise<{ seasonSlug: string }>;
};

export default async function ComicSeasonPage({ params }: ComicSeasonPageProps) {
  const { seasonSlug } = await params;
  const season = await getPublishedComicSeasonBySlug(seasonSlug);

  if (!season) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="stack-row">
          <Link href="/comic" className="button button--secondary">
            Back to comic
          </Link>
        </div>

        <div className="page-hero">
          <p className="eyebrow">Season {season.seasonNumber}</p>
          <h1>{season.title}</h1>
          <p>{season.summary}</p>
          <div className="page-hero__stats">
            <span className="pill">{season.chapters.length} published chapters</span>
            <span className="pill">
              {season.chapters.reduce((sum, chapter) => sum + chapter.episodes.length, 0)} published episodes
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
                <span className="pill">{chapter.episodes.length} episodes</span>
              </div>
              <div className="stack-row">
                <Link href={`/comic/${season.slug}/${chapter.slug}`} className="button button--primary">
                  Open chapter
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
