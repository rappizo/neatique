import Link from "next/link";
import { createComicCharacterAction } from "@/app/admin/comic-actions";
import { getComicProject } from "@/lib/queries";

export default async function AdminNewComicCharacterPage() {
  const project = await getComicProject();

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/characters" className="button button--secondary">
          Back to characters
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Characters</p>
        <h1>Create a new locked character profile.</h1>
        <p>
          We will generate the matching workspace folder in <code>comic/characters</code> so you
          can drop in stable model references right after this.
        </p>
      </div>

      <section className="admin-form">
        <h2>Character details</h2>
        <form action={createComicCharacterAction}>
          <input type="hidden" name="projectId" value={project?.id || ""} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-character-name">Name</label>
              <input id="comic-character-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="comic-character-slug">Slug</label>
              <input id="comic-character-slug" name="slug" />
            </div>
            <div className="field">
              <label htmlFor="comic-character-role">Role</label>
              <input id="comic-character-role" name="role" defaultValue="Main cast" />
            </div>
            <div className="field">
              <label htmlFor="comic-character-sort-order">Sort order</label>
              <input id="comic-character-sort-order" name="sortOrder" type="number" min="0" defaultValue="0" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="comic-character-appearance">Fixed appearance</label>
            <textarea
              id="comic-character-appearance"
              name="appearance"
              rows={8}
              placeholder="Describe the silhouette, hair, face, outfit, accessories, color palette, and stable design rules."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-personality">Personality</label>
            <textarea
              id="comic-character-personality"
              name="personality"
              rows={8}
              placeholder="Describe temperament, motivations, emotional habits, strengths, flaws, and relationship energy."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-speech-guide">Speech guide</label>
            <textarea
              id="comic-character-speech-guide"
              name="speechGuide"
              rows={6}
              placeholder="Describe tone, cadence, favorite phrasing, restraint level, and dialogue patterns."
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-reference-notes">Reference notes</label>
            <textarea
              id="comic-character-reference-notes"
              name="referenceNotes"
              rows={4}
              placeholder="Add notes about which reference images are most important to upload for image generation."
            />
          </div>

          <button type="submit" className="button button--primary">
            Create character
          </button>
        </form>
      </section>
    </div>
  );
}
