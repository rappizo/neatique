import Link from "next/link";
import { getComicProject, getComicSeasonsForAdmin } from "@/lib/comic-queries";

type AdminComicSeasonsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Season created.",
  saved: "Season updated.",
  "missing-fields": "Fill in the required season fields before saving.",
  "missing-season": "That season could not be found."
};

export default async function AdminComicSeasonsPage({
  searchParams
}: AdminComicSeasonsPageProps) {
  const [project, seasons, params] = await Promise.all([
    getComicProject(),
    getComicSeasonsForAdmin(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/seasons/new" className="button button--primary">
          Add season
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Seasons</p>
        <h1>Structure the story by season, chapter, and episode.</h1>
        <p>
          These records power both the public reading order and the backend prompt workflow. Every
          season can branch into chapters, then into episode-level prompt packs and comic pages.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      {!project ? (
        <p className="notice notice--warning">
          Save the comic project first if you want the season tree attached to a named story bible.
        </p>
      ) : null}

      <section className="admin-form admin-table">
        {seasons.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Status</th>
                  <th>Chapters</th>
                  <th>Episodes</th>
                  <th>Published episodes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                  <tr key={season.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{season.title}</strong>
                        <span className="form-note">
                          Season {season.seasonNumber} / {season.slug}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-table__status-badge ${
                          season.published
                            ? "admin-table__status-badge--success"
                            : "admin-table__status-badge--warning"
                        }`}
                      >
                        {season.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>{season.chapterCount || 0}</td>
                    <td>{season.episodeCount || 0}</td>
                    <td>{season.publishedEpisodeCount || 0}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/admin/comic/seasons/${season.id}`} className="button button--primary">
                          Edit season
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <h2>No seasons yet</h2>
            <p className="form-note">
              Add your first season now. The matching <code>comic/seasons/...</code> folder will be
              scaffolded automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
