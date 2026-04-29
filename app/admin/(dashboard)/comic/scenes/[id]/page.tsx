import Link from "next/link";
import { notFound } from "next/navigation";
import { updateComicSceneAction } from "@/app/admin/comic-actions";
import { getComicSceneById } from "@/lib/comic-queries";

type AdminComicSceneDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Scene created.",
  saved: "Scene updated.",
  "missing-fields": "Fill in the required scene fields before saving."
};

export default async function AdminComicSceneDetailPage({
  params,
  searchParams
}: AdminComicSceneDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const scene = await getComicSceneById(id);

  if (!scene) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/scenes" className="button button--secondary">
          Back to scenes
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Scenes</p>
        <h1>Edit {scene.name}.</h1>
        <p>
          Keep reusable background logic, mood rules, and upload notes here so the prompt studio can
          guide image generation more reliably.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Scene profile</h2>
        <form action={updateComicSceneAction}>
          <input type="hidden" name="id" value={scene.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-scene-name">Scene name</label>
              <input id="comic-scene-name" name="name" defaultValue={scene.name} required />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-slug">Slug</label>
              <input id="comic-scene-slug" name="slug" defaultValue={scene.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-sort-order">Sort order</label>
              <input
                id="comic-scene-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={scene.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="active" defaultChecked={scene.active} />
            Active in prompt generation
          </label>

          <div className="field">
            <label htmlFor="comic-scene-summary">Scene summary</label>
            <textarea id="comic-scene-summary" name="summary" rows={5} defaultValue={scene.summary} />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-visual-notes">Visual notes</label>
            <textarea
              id="comic-scene-visual-notes"
              name="visualNotes"
              rows={7}
              defaultValue={scene.visualNotes}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-mood-notes">Mood notes</label>
            <textarea
              id="comic-scene-mood-notes"
              name="moodNotes"
              rows={6}
              defaultValue={scene.moodNotes}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-reference-notes">Reference notes</label>
            <textarea
              id="comic-scene-reference-notes"
              name="referenceNotes"
              rows={4}
              defaultValue={scene.referenceNotes || ""}
            />
          </div>

          <div className="stack-row">
            <span className="pill">{scene.referenceFolder}</span>
          </div>

          <button type="submit" className="button button--primary">
            Save scene
          </button>
        </form>
      </section>
    </div>
  );
}
