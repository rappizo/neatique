import Link from "next/link";
import { createComicSceneAction } from "@/app/admin/comic-actions";
import { getComicProject } from "@/lib/comic-queries";

export default async function AdminNewComicScenePage() {
  const project = await getComicProject();

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/scenes" className="button button--secondary">
          Back to scenes
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Scenes</p>
        <h1>Create a reusable scene profile.</h1>
        <p>
          We will generate the matching <code>comic/scenes</code> folder so you can keep fixed
          location references and lighting variants organized.
        </p>
      </div>

      <section className="admin-form">
        <h2>Scene details</h2>
        <form action={createComicSceneAction}>
          <input type="hidden" name="projectId" value={project?.id || ""} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-scene-name">Scene name</label>
              <input id="comic-scene-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-slug">Slug</label>
              <input id="comic-scene-slug" name="slug" />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-sort-order">Sort order</label>
              <input id="comic-scene-sort-order" name="sortOrder" type="number" min="0" defaultValue="0" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="comic-scene-summary">Scene summary</label>
            <textarea
              id="comic-scene-summary"
              name="summary"
              rows={5}
              placeholder="Describe what this scene is and where it appears in the story."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-visual-notes">Visual notes</label>
            <textarea
              id="comic-scene-visual-notes"
              name="visualNotes"
              rows={7}
              placeholder="Describe layout, architecture, props, camera affordances, and stable scene structure."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-mood-notes">Mood notes</label>
            <textarea
              id="comic-scene-mood-notes"
              name="moodNotes"
              rows={6}
              placeholder="Describe lighting, time-of-day options, emotional atmosphere, and color behavior."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-reference-notes">Reference notes</label>
            <textarea
              id="comic-scene-reference-notes"
              name="referenceNotes"
              rows={4}
              placeholder="Add notes about which reference frames matter most for image generation."
            />
          </div>

          <button type="submit" className="button button--primary">
            Create scene
          </button>
        </form>
      </section>
    </div>
  );
}
