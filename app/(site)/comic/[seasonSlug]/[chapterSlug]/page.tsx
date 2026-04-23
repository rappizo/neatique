import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedComicChapterBySlugs } from "@/lib/queries";

type ComicChapterPageProps = {
  params: Promise<{ seasonSlug: string; chapterSlug: string }>;
};

export default async function ComicChapterPage({ params }: ComicChapterPageProps) {
  const { seasonSlug, chapterSlug } = await params;
  const chapter = await getPublishedComicChapterBySlugs(seasonSlug, chapterSlug);

  if (!chapter) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="stack-row">
          <Link href={`/comic/${seasonSlug}`} className="button button--secondary">
            Back to season
          </Link>
        </div>

        <div className="page-hero">
          <p className="eyebrow">
            Season / Chapter {chapter.chapterNumber}
          </p>
          <h1>{chapter.title}</h1>
          <p>{chapter.summary}</p>
          <div className="page-hero__stats">
            <span className="pill">{chapter.episodes.length} published episodes</span>
          </div>
        </div>

        <div className="comic-grid comic-grid--episodes">
          {chapter.episodes.map((episode) => (
            <article key={episode.id} className="panel comic-card comic-card--episode">
              {episode.coverImageUrl ? (
                <Link href={`/comic/${seasonSlug}/${chapterSlug}/${episode.slug}`} className="comic-card__image-link">
                  <div className="comic-card__cover">
                    <img
                      src={episode.coverImageUrl}
                      alt={episode.coverImageAlt || episode.title}
                      loading="lazy"
                    />
                  </div>
                </Link>
              ) : episode.assets[0] ? (
                <Link href={`/comic/${seasonSlug}/${chapterSlug}/${episode.slug}`} className="comic-card__image-link">
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
                  <span className="pill">{episode.assets.length} comic pages</span>
                </div>
                <div className="stack-row">
                  <Link
                    href={`/comic/${seasonSlug}/${chapterSlug}/${episode.slug}`}
                    className="button button--primary"
                  >
                    Read episode
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
