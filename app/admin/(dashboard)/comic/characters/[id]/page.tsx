import Link from "next/link";
import { notFound } from "next/navigation";
import { updateComicCharacterAction } from "@/app/admin/comic-actions";
import { getComicCharacterById } from "@/lib/comic-queries";

type AdminComicCharacterDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Character created.",
  saved: "Character updated.",
  "missing-fields": "Fill in the required character fields before saving."
};

export default async function AdminComicCharacterDetailPage({
  params,
  searchParams
}: AdminComicCharacterDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const character = await getComicCharacterById(id);

  if (!character) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/characters" className="button button--secondary">
          Back to characters
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Characters</p>
        <h1>Edit {character.name}.</h1>
        <p>
          Keep the visual lock and personality lock sharp here so episode prompt packs can stay
          consistent across seasons.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Character profile</h2>
        <form action={updateComicCharacterAction}>
          <input type="hidden" name="id" value={character.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-character-name">Name</label>
              <input id="comic-character-name" name="name" defaultValue={character.name} required />
            </div>
            <div className="field">
              <label htmlFor="comic-character-slug">Slug</label>
              <input id="comic-character-slug" name="slug" defaultValue={character.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-character-role">Role</label>
              <input id="comic-character-role" name="role" defaultValue={character.role} />
            </div>
            <div className="field">
              <label htmlFor="comic-character-sort-order">Sort order</label>
              <input
                id="comic-character-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={character.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="active" defaultChecked={character.active} />
            Active in prompt generation
          </label>

          <div className="field">
            <label htmlFor="comic-character-appearance">Fixed appearance</label>
            <textarea
              id="comic-character-appearance"
              name="appearance"
              rows={8}
              defaultValue={character.appearance}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-personality">Personality</label>
            <textarea
              id="comic-character-personality"
              name="personality"
              rows={8}
              defaultValue={character.personality}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-speech-guide">Speech guide</label>
            <textarea
              id="comic-character-speech-guide"
              name="speechGuide"
              rows={6}
              defaultValue={character.speechGuide}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-reference-notes">Reference notes</label>
            <textarea
              id="comic-character-reference-notes"
              name="referenceNotes"
              rows={4}
              defaultValue={character.referenceNotes || ""}
            />
          </div>

          <div className="stack-row">
            <span className="pill">{character.referenceFolder}</span>
          </div>

          <button type="submit" className="button button--primary">
            Save character
          </button>
        </form>
      </section>
    </div>
  );
}
