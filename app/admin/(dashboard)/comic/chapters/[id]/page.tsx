import Link from "next/link";
import { notFound } from "next/navigation";
import { createComicEpisodeAction, updateComicChapterAction } from "@/app/admin/comic-actions";
import { getComicChapterById } from "@/lib/comic-queries";

type AdminComicChapterDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Chapter created.",
  saved: "Chapter updated.",
  "missing-fields": "Fill in the required chapter fields before saving.",
  "missing-chapter": "That chapter could not be found."
};

export default async function AdminComicChapterDetailPage({
  params,
  searchParams
}: AdminComicChapterDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const chapterPage = await getComicChapterById(id);

  if (!chapterPage) {
    notFound();
  }

  const { season, chapter, episodes } = chapterPage;
  const suggestedEpisodeNumber =
    episodes.length > 0 ? Math.max(...episodes.map((episode) => episode.episodeNumber)) + 1 : 1;

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href={`/admin/comic/seasons/${season.id}`} className="button button--secondary">
          Back to season
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Chapters</p>
        <h1>Edit {chapter.title}.</h1>
        <p>
          Use the chapter level for flow and pacing, then break the work into episode-specific
          prompt packs, scripts, and comic assets.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Chapter settings</h2>
        <form action={updateComicChapterAction}>
          <input type="hidden" name="id" value={chapter.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-chapter-number">Chapter number</label>
              <input
                id="comic-chapter-number"
                name="chapterNumber"
                type="number"
                min="1"
                defaultValue={chapter.chapterNumber}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-chapter-title">Chapter title</label>
              <input id="comic-chapter-title" name="title" defaultValue={chapter.title} required />
            </div>
            <div className="field">
              <label htmlFor="comic-chapter-slug">Slug</label>
              <input id="comic-chapter-slug" name="slug" defaultValue={chapter.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-chapter-sort-order">Sort order</label>
              <input
                id="comic-chapter-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={chapter.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" defaultChecked={chapter.published} />
            Published chapter shell
          </label>

          <div className="field">
            <label htmlFor="comic-chapter-summary">Chapter summary</label>
            <textarea id="comic-chapter-summary" name="summary" rows={5} defaultValue={chapter.summary} />
          </div>

          <div className="field">
            <label htmlFor="comic-chapter-outline">Chapter outline</label>
            <textarea id="comic-chapter-outline" name="outline" rows={8} defaultValue={chapter.outline} />
          </div>

          <button type="submit" className="button button--primary">
            Save chapter
          </button>
        </form>
      </section>

      <section className="admin-form">
        <h2>Add an episode to this chapter</h2>
        <form action={createComicEpisodeAction}>
          <input type="hidden" name="chapterId" value={chapter.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-episode-number">Episode number</label>
              <input
                id="comic-episode-number"
                name="episodeNumber"
                type="number"
                min="1"
                defaultValue={suggestedEpisodeNumber}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-title">Episode title</label>
              <input id="comic-episode-title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-slug">Slug</label>
              <input id="comic-episode-slug" name="slug" />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-sort-order">Sort order</label>
              <input
                id="comic-episode-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={suggestedEpisodeNumber}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" />
            Published episode shell
          </label>

          <div className="field">
            <label htmlFor="comic-episode-summary">Episode summary</label>
            <textarea id="comic-episode-summary" name="summary" rows={4} />
          </div>

          <div className="field">
            <label htmlFor="comic-episode-outline">Episode outline</label>
            <textarea id="comic-episode-outline" name="outline" rows={7} />
          </div>

          <button type="submit" className="button button--primary">
            Create episode
          </button>
        </form>
      </section>

      <section className="admin-form admin-table">
        <h2>Episodes in this chapter</h2>
        {episodes.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>Episode</th>
                  <th>Status</th>
                  <th>Assets</th>
                  <th>Prompt runs</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((episode) => (
                  <tr key={episode.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{episode.title}</strong>
                        <span className="form-note">
                          Episode {episode.episodeNumber} / {episode.slug}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-table__status-badge ${
                          episode.published
                            ? "admin-table__status-badge--success"
                            : "admin-table__status-badge--warning"
                        }`}
                      >
                        {episode.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>{episode.assetCount || 0}</td>
                    <td>{episode.promptRunCount || 0}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/admin/comic/episodes/${episode.id}`} className="button button--primary">
                          Edit episode
                        </Link>
                        <Link
                          href={`/admin/comic/prompt-studio?episodeId=${episode.id}`}
                          className="button button--secondary"
                        >
                          Prompt
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">No episodes yet. Create the first episode above.</p>
        )}
      </section>
    </div>
  );
}
