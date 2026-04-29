import Link from "next/link";
import { saveComicProjectAction } from "@/app/admin/comic-actions";
import { getComicProject } from "@/lib/comic-queries";

type AdminComicProjectPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  saved: "Comic project bible saved.",
  "missing-title": "Add a project title before saving."
};

export default async function AdminComicProjectPage({
  searchParams
}: AdminComicProjectPageProps) {
  const [project, params] = await Promise.all([getComicProject(), searchParams]);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Project</p>
        <h1>Set the master comic bible.</h1>
        <p>
          This is the source of truth for the long-form story, world rules, visual direction, and
          guardrails that every prompt should inherit.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      <section className="admin-form">
        <h2>Project bible</h2>
        <form action={saveComicProjectAction}>
          <input type="hidden" name="id" value={project?.id || ""} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-project-title">Project title</label>
              <input
                id="comic-project-title"
                name="title"
                defaultValue={project?.title || "Neatique Comic Universe"}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-project-slug">Project slug</label>
              <input
                id="comic-project-slug"
                name="slug"
                defaultValue={project?.slug || "main"}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="comic-project-short-description">Short description</label>
            <textarea
              id="comic-project-short-description"
              name="shortDescription"
              rows={4}
              defaultValue={
                project?.shortDescription ||
                "A multi-season comic project with stable characters, reusable scene references, and production-ready prompt planning."
              }
            />
          </div>

          <div className="field">
            <label htmlFor="comic-project-story-outline">Overall story outline</label>
            <textarea
              id="comic-project-story-outline"
              name="storyOutline"
              rows={12}
              defaultValue={project?.storyOutline || "Add the full multi-season story outline here."}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-project-world-rules">World rules and canon guardrails</label>
            <textarea
              id="comic-project-world-rules"
              name="worldRules"
              rows={10}
              defaultValue={
                project?.worldRules ||
                "Add the rules, logic, relationships, timeline guardrails, and non-negotiable canon here."
              }
            />
          </div>

          <div className="field">
            <label htmlFor="comic-project-visual-style">Visual style guide</label>
            <textarea
              id="comic-project-visual-style"
              name="visualStyleGuide"
              rows={10}
              defaultValue={
                project?.visualStyleGuide ||
                "Define line quality, comic pacing, panel rhythm, camera language, color mood, and continuity rules here."
              }
            />
          </div>

          <div className="field">
            <label htmlFor="comic-project-workflow-notes">Workflow notes</label>
            <textarea
              id="comic-project-workflow-notes"
              name="workflowNotes"
              rows={6}
              defaultValue={
                project?.workflowNotes ||
                "Use this area for extra prompt rules, image-generation reminders, and collaboration notes for Codex."
              }
            />
          </div>

          <button type="submit" className="button button--primary">
            Save comic project
          </button>
        </form>
      </section>
    </div>
  );
}
