import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedComicEpisodeBySlugs } from "@/lib/comic-queries";

type ComicEpisodePageProps = {
  params: Promise<{ seasonSlug: string; chapterSlug: string; episodeSlug: string }>;
};

export default async function ComicEpisodePage({ params }: ComicEpisodePageProps) {
  const { seasonSlug, chapterSlug, episodeSlug } = await params;
  const episode = await getPublishedComicEpisodeBySlugs(seasonSlug, chapterSlug, episodeSlug);

  if (!episode) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="stack-row">
          <Link href={`/comic/${seasonSlug}/${chapterSlug}`} className="button button--secondary">
            Back to chapter
          </Link>
        </div>

        <div className="page-hero">
          <p className="eyebrow">
            {episode.seasonTitle} / {episode.chapterTitle}
          </p>
          <h1>{episode.title}</h1>
          <p>{episode.summary}</p>
          <div className="page-hero__stats">
            <span className="pill">Episode {episode.episodeNumber}</span>
            <span className="pill">{episode.assets.length} published comic pages</span>
          </div>
        </div>

        {episode.coverImageUrl ? (
          <section className="panel comic-episode-cover">
            <img src={episode.coverImageUrl} alt={episode.coverImageAlt || episode.title} />
          </section>
        ) : null}

        <section className="panel comic-episode-reader">
          <div className="comic-episode-reader__intro">
            <h2>Episode pages</h2>
            <p>
              Read the finished episode below. Only published comic assets appear here, so drafts
              stay hidden until they are ready.
            </p>
          </div>

          <div className="comic-page-stack">
            {episode.assets.map((asset) => (
              <figure key={asset.id} className="comic-page">
                <img src={asset.imageUrl} alt={asset.altText || asset.title} loading="lazy" />
                {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
