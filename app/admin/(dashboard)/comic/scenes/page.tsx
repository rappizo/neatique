import Link from "next/link";
import { getComicProject, getComicScenes } from "@/lib/queries";

type AdminComicScenesPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Scene created.",
  saved: "Scene updated.",
  "missing-fields": "Fill in the required scene fields before saving.",
  "missing-scene": "That scene could not be found."
};

export default async function AdminComicScenesPage({
  searchParams
}: AdminComicScenesPageProps) {
  const [project, scenes, params] = await Promise.all([
    getComicProject(),
    getComicScenes(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/scenes/new" className="button button--primary">
          Add scene
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Scenes</p>
        <h1>Build the reusable scene library.</h1>
        <p>
          Use scenes for fixed locations, mood lighting, background logic, and the reference uploads
          the prompt workflow should request before generating comic pages.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      {!project ? (
        <p className="notice notice--warning">
          Save the comic project first if you want the scene library tied to a named story bible.
        </p>
      ) : null}

      <div className="admin-product-grid">
        {scenes.map((scene) => (
          <article key={scene.id} className="admin-product-card">
            <div className="admin-product-card__body">
              <div className="product-card__meta">
                <span>{scene.active ? "Active" : "Inactive"}</span>
                <span>{scene.slug}</span>
              </div>
              <h3>{scene.name}</h3>
              <p>{scene.summary}</p>
              <div className="stack-row">
                <span className="pill">{scene.referenceFolder}</span>
              </div>
              <div className="stack-row">
                <Link href={`/admin/comic/scenes/${scene.id}`} className="button button--primary">
                  Edit scene
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {scenes.length === 0 ? (
        <section className="admin-form">
          <h2>No scenes yet</h2>
          <p className="form-note">
            Add your first stable location now, then place the fixed background and lighting
            references into the generated <code>comic/scenes/...</code> folder.
          </p>
        </section>
      ) : null}
    </div>
  );
}
