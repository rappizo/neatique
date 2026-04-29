import Link from "next/link";
import { notFound } from "next/navigation";
import { createComicChapterAction, updateComicSeasonAction } from "@/app/admin/comic-actions";
import { getComicSeasonById } from "@/lib/comic-queries";

type AdminComicSeasonDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Season created.",
  saved: "Season updated.",
  "missing-fields": "Fill in the required season fields before saving.",
  "missing-season": "That season could not be found.",
  "chapter-created": "Chapter created."
};

export default async function AdminComicSeasonDetailPage({
  params,
  searchParams
}: AdminComicSeasonDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const seasonPage = await getComicSeasonById(id);

  if (!seasonPage) {
    notFound();
  }

  const { season, chapters } = seasonPage;
  const suggestedChapterNumber =
    chapters.length > 0 ? Math.max(...chapters.map((chapter) => chapter.chapterNumber)) + 1 : 1;

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/seasons" className="button button--secondary">
          Back to seasons
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Seasons</p>
        <h1>Edit {season.title}.</h1>
        <p>
          Use the season level for the big story arc, then drop into individual chapters for
          episode planning and prompt work.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Season settings</h2>
        <form action={updateComicSeasonAction}>
          <input type="hidden" name="id" value={season.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-season-number">Season number</label>
              <input
                id="comic-season-number"
                name="seasonNumber"
                type="number"
                min="1"
                defaultValue={season.seasonNumber}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-season-title">Season title</label>
              <input id="comic-season-title" name="title" defaultValue={season.title} required />
            </div>
            <div className="field">
              <label htmlFor="comic-season-slug">Slug</label>
              <input id="comic-season-slug" name="slug" defaultValue={season.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-season-sort-order">Sort order</label>
              <input
                id="comic-season-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={season.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" defaultChecked={season.published} />
            Published season shell
          </label>

          <div className="field">
            <label htmlFor="comic-season-summary">Season summary</label>
            <textarea id="comic-season-summary" name="summary" rows={6} defaultValue={season.summary} />
          </div>

          <div className="field">
            <label htmlFor="comic-season-outline">Season outline</label>
            <textarea id="comic-season-outline" name="outline" rows={10} defaultValue={season.outline} />
          </div>

          <button type="submit" className="button button--primary">
            Save season
          </button>
        </form>
      </section>

      <section className="admin-form">
        <h2>Add a chapter to this season</h2>
        <form action={createComicChapterAction}>
          <input type="hidden" name="seasonId" value={season.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-chapter-number">Chapter number</label>
              <input
                id="comic-chapter-number"
                name="chapterNumber"
                type="number"
                min="1"
                defaultValue={suggestedChapterNumber}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-chapter-title">Chapter title</label>
              <input id="comic-chapter-title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="comic-chapter-slug">Slug</label>
              <input id="comic-chapter-slug" name="slug" />
            </div>
            <div className="field">
              <label htmlFor="comic-chapter-sort-order">Sort order</label>
              <input
                id="comic-chapter-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={suggestedChapterNumber}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" />
            Published chapter shell
          </label>

          <div className="field">
            <label htmlFor="comic-chapter-summary">Chapter summary</label>
            <textarea id="comic-chapter-summary" name="summary" rows={5} />
          </div>

          <div className="field">
            <label htmlFor="comic-chapter-outline">Chapter outline</label>
            <textarea id="comic-chapter-outline" name="outline" rows={8} />
          </div>

          <button type="submit" className="button button--primary">
            Create chapter
          </button>
        </form>
      </section>

      <section className="admin-form admin-table">
        <h2>Chapters in this season</h2>
        {chapters.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Status</th>
                  <th>Episodes</th>
                  <th>Published episodes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter) => (
                  <tr key={chapter.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{chapter.title}</strong>
                        <span className="form-note">
                          Chapter {chapter.chapterNumber} / {chapter.slug}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-table__status-badge ${
                          chapter.published
                            ? "admin-table__status-badge--success"
                            : "admin-table__status-badge--warning"
                        }`}
                      >
                        {chapter.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>{chapter.episodeCount || 0}</td>
                    <td>{chapter.publishedEpisodeCount || 0}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/admin/comic/chapters/${chapter.id}`} className="button button--primary">
                          Edit chapter
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">No chapters yet. Create the first chapter above.</p>
        )}
      </section>
    </div>
  );
}
