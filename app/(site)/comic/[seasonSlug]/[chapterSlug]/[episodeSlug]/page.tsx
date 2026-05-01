import Link from "next/link";
import { notFound } from "next/navigation";
import { ComicLanguageSwitcher } from "@/components/site/comic-language-switcher";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";
import { getPublishedComicEpisodeBySlugs } from "@/lib/comic-queries";

type ComicEpisodePageProps = {
  params: Promise<{ seasonSlug: string; chapterSlug: string; episodeSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicEpisodePage({ params, searchParams }: ComicEpisodePageProps) {
  const { seasonSlug, chapterSlug, episodeSlug } = await params;
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);
  const episode = await getPublishedComicEpisodeBySlugs(
    seasonSlug,
    chapterSlug,
    episodeSlug,
    languageState.language
  );
  const isChinese = languageState.language === "zh";

  if (!episode) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="stack-row comic-page-toolbar">
          <Link
            href={getComicLanguageHref(
              `/comic/${seasonSlug}/${chapterSlug}`,
              languageState.language
            )}
            className="button button--secondary"
          >
            {isChinese ? "返回章节" : "Back to chapter"}
          </Link>
          <ComicLanguageSwitcher
            basePath={`/comic/${seasonSlug}/${chapterSlug}/${episodeSlug}`}
            language={languageState.language}
            show={languageState.showSwitcher}
          />
        </div>

        <div className="page-hero">
          <p className="eyebrow">
            {episode.seasonTitle} / {episode.chapterTitle}
          </p>
          <h1>{episode.title}</h1>
          <p>{episode.summary}</p>
          <div className="page-hero__stats">
            <span className="pill">Episode {episode.episodeNumber}</span>
            <span className="pill">
              {episode.assets.length} {isChinese ? "页已发布漫画" : "published comic pages"}
            </span>
          </div>
        </div>

        {episode.coverImageUrl ? (
          <section className="panel comic-episode-cover">
            <img src={episode.coverImageUrl} alt={episode.coverImageAlt || episode.title} />
          </section>
        ) : null}

        <section className="panel comic-episode-reader">
          <div className="comic-episode-reader__intro">
            <h2>{isChinese ? "本集漫画页" : "Episode pages"}</h2>
            <p>
              {isChinese
                ? "下方显示已发布的正式漫画页。草稿会继续隐藏，直到后台完成审核。"
                : "Read the finished episode below. Only published comic assets appear here, so drafts stay hidden until they are ready."}
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
