import Link from "next/link";
import { getComicCharacters, getComicProject } from "@/lib/comic-queries";

type AdminComicCharactersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Character created.",
  saved: "Character updated.",
  "missing-fields": "Fill in the required character fields before saving.",
  "missing-character": "That character could not be found."
};

export default async function AdminComicCharactersPage({
  searchParams
}: AdminComicCharactersPageProps) {
  const [project, characters, params] = await Promise.all([
    getComicProject(),
    getComicCharacters(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/characters/new" className="button button--primary">
          Add character
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Characters</p>
        <h1>Lock your cast before generating comic prompts.</h1>
        <p>
          Each character stores fixed visual notes, personality, voice, and a reference folder that
          the prompt workflow can point to when preparing <code>gpt-image-2</code> inputs.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      {!project ? (
        <p className="notice notice--warning">
          Save the comic project bible first. We will auto-create a default project if you add a
          character now, but defining the project first keeps the canon cleaner.
        </p>
      ) : null}

      <div className="admin-product-grid">
        {characters.map((character) => (
          <article key={character.id} className="admin-product-card">
            <div className="admin-product-card__body">
              <div className="product-card__meta">
                <span>{character.role}</span>
                <span>{character.active ? "Active" : "Inactive"}</span>
                <span>{character.slug}</span>
              </div>
              <h3>{character.name}</h3>
              <p>{character.personality}</p>
              <div className="stack-row">
                <span className="pill">{character.referenceFolder}</span>
              </div>
              <div className="stack-row">
                <Link href={`/admin/comic/characters/${character.id}`} className="button button--primary">
                  Edit character
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {characters.length === 0 ? (
        <section className="admin-form">
          <h2>No characters yet</h2>
          <p className="form-note">
            Add the first character now, then place stable reference images inside the generated
            <code> comic/characters/...</code> folder.
          </p>
        </section>
      ) : null}
    </div>
  );
}
