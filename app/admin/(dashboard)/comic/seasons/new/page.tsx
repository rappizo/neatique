import Link from "next/link";
import { createComicSeasonAction } from "@/app/admin/comic-actions";
import { getComicProject, getComicSeasonsForAdmin } from "@/lib/queries";

export default async function AdminNewComicSeasonPage() {
  const [project, seasons] = await Promise.all([getComicProject(), getComicSeasonsForAdmin()]);
  const suggestedSeasonNumber =
    seasons.length > 0 ? Math.max(...seasons.map((season) => season.seasonNumber)) + 1 : 1;

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/seasons" className="button button--secondary">
          Back to seasons
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Seasons</p>
        <h1>Create a new season.</h1>
        <p>
          Once the season exists, you can add chapters, then episodes, then prompt packs and comic
          pages under the same story branch.
        </p>
      </div>

      <section className="admin-form">
        <h2>Season details</h2>
        <form action={createComicSeasonAction}>
          <input type="hidden" name="projectId" value={project?.id || ""} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-season-number">Season number</label>
              <input
                id="comic-season-number"
                name="seasonNumber"
                type="number"
                min="1"
                defaultValue={suggestedSeasonNumber}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-season-title">Season title</label>
              <input id="comic-season-title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="comic-season-slug">Slug</label>
              <input id="comic-season-slug" name="slug" />
            </div>
            <div className="field">
              <label htmlFor="comic-season-sort-order">Sort order</label>
              <input
                id="comic-season-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={suggestedSeasonNumber}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" />
            Publish this season shell to the frontend when it has published content
          </label>

          <div className="field">
            <label htmlFor="comic-season-summary">Season summary</label>
            <textarea
              id="comic-season-summary"
              name="summary"
              rows={6}
              placeholder="Describe the purpose, tone, and emotional promise of this season."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-season-outline">Season outline</label>
            <textarea
              id="comic-season-outline"
              name="outline"
              rows={10}
              placeholder="Add the chapter-level flow, major reveals, and throughline for the season."
            />
          </div>

          <button type="submit" className="button button--primary">
            Create season
          </button>
        </form>
      </section>
    </div>
  );
}
