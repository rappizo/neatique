import Link from "next/link";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { syncComicWorkspaceAction } from "@/app/admin/comic-actions";
import { getOpenAiComicSettings } from "@/lib/openai-comic";
import { getComicAdminOverview } from "@/lib/comic-queries";
import { formatDate } from "@/lib/format";

type AdminComicOverviewPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  saved: "Comic project settings were saved.",
  created: "Comic record created.",
  "workspace-synced": "Comic workspace synced into the admin database.",
  "workspace-sync-failed": "Comic workspace sync failed. Check the server logs and try again.",
  "prompt-generated": "A fresh comic prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Review the latest prompt run details."
};

export default async function AdminComicOverviewPage({
  searchParams
}: AdminComicOverviewPageProps) {
  const [overview, openAiSettings, params] = await Promise.all([
    getComicAdminOverview(),
    Promise.resolve(getOpenAiComicSettings()),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Comic</p>
        <h1>Build the comic bible, prompt workflow, and publishing pipeline in one place.</h1>
        <p>
          Start by locking the project canon, characters, and scenes. Then create seasons,
          chapters, and episodes, generate prompt packs, and publish completed comic episodes to
          the site.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Project</p>
          <h3>{overview.project?.title || "Comic bible not filled yet"}</h3>
          <p>
            {overview.project?.shortDescription ||
              "Save the main story bible first so every prompt can read the same canon and style rules."}
          </p>
          <div className="stack-row">
            <span className="pill">{overview.seasonCount} seasons</span>
            <span className="pill">{overview.chapterCount} chapters</span>
            <span className="pill">{overview.episodeCount} episodes</span>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Library</p>
          <h3>{overview.characterCount} characters / {overview.sceneCount} scenes</h3>
          <p>
            Keep stable looks, personalities, and scene notes here so the prompt workflow can tell
            you exactly what to upload for <code>gpt-image-2</code>.
          </p>
          <div className="stack-row">
            <span className="pill">{openAiSettings.model}</span>
            <span className="pill">{openAiSettings.imageModel}</span>
            <span className="pill">{openAiSettings.ready ? "AI ready" : "Set OpenAI key"}</span>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Publishing</p>
          <h3>{overview.publishedEpisodeCount} published episodes</h3>
          <p>
            Only published episodes with real comic assets will appear on the public <code>/comic</code> pages.
          </p>
          <div className="stack-row">
            <span className="pill">Public route /comic</span>
            <span className="pill">Draft-safe workflow</span>
          </div>
        </section>
      </div>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Sync repo workspace</h2>
            <p className="form-note">
              Import the current <code>comic/</code> bible, character sheets, season outlines,
              chapter outlines, and chapter scene packs into the admin database.
            </p>
          </div>
          <form action={syncComicWorkspaceAction}>
            <input type="hidden" name="redirectTo" value="/admin/comic" />
            <PendingSubmitButton
              idleLabel="Sync workspace to admin"
              pendingLabel="Syncing comic workspace..."
              modalTitle="Syncing comic workspace"
              modalDescription="Reading the repo-level comic bible, character library, chapter scene packs, and season structure into the admin database."
            />
          </form>
        </div>
      </section>

      <div className="cards-3">
        <section className="admin-form">
          <h2>Story bible</h2>
          <p className="form-note">
            Set the master project outline, world rules, and style guide before doing heavy prompt
            work.
          </p>
          <div className="stack-row">
            <Link href="/admin/comic/project" className="button button--primary">
              Open project bible
            </Link>
          </div>
        </section>

        <section className="admin-form">
          <h2>Reference library</h2>
          <p className="form-note">
            Add characters and scenes, then keep your stable visual references under the new
            repo-level <code>comic/</code> workspace folders.
          </p>
          <div className="stack-row">
            <Link href="/admin/comic/characters" className="button button--primary">
              Characters
            </Link>
            <Link href="/admin/comic/scenes" className="button button--secondary">
              Scenes
            </Link>
          </div>
        </section>

        <section className="admin-form">
          <h2>Prompt studio</h2>
          <p className="form-note">
            Generate episode-level script expansions, panel prompts, and a required upload checklist
            for <code>gpt-image-2</code>.
          </p>
          <div className="stack-row">
            <Link href="/admin/comic/prompt-studio" className="button button--primary">
              Open prompt studio
            </Link>
          </div>
        </section>
      </div>

      <section className="admin-form admin-table">
        <div className="admin-review-pagination">
          <div>
            <h2>Recent episode work</h2>
            <p className="form-note">
              Keep moving from overview to chapter breakdown to episode prompt generation without
              leaving the comic workspace.
            </p>
          </div>
          <div className="stack-row">
            <Link href="/admin/comic/seasons" className="button button--secondary">
              Manage seasons
            </Link>
          </div>
        </div>

        {overview.recentEpisodes.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>Episode</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Assets</th>
                  <th>Prompt runs</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentEpisodes.map((episode) => (
                  <tr key={episode.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{episode.title}</strong>
                        <span className="form-note">Episode {episode.episodeNumber}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <span>{episode.seasonTitle}</span>
                        <span className="form-note">{episode.chapterTitle}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-table__status-badge ${
                          episode.published
                            ? "admin-table__status-badge--success"
                            : "admin-table__status-badge--warning"
                        }`}
                      >
                        {episode.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>{episode.assetCount || 0}</td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <span>{episode.promptRunCount || 0} total</span>
                        <span className="form-note">
                          {episode.latestPromptRunAt ? formatDate(episode.latestPromptRunAt) : "No AI run yet"}
                        </span>
                      </div>
                    </td>
                    <td>{formatDate(episode.updatedAt)}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/admin/comic/episodes/${episode.id}`} className="button button--primary">
                          Edit
                        </Link>
                        <Link
                          href={`/admin/comic/prompt-studio?episodeId=${episode.id}`}
                          className="button button--secondary"
                        >
                          Prompt
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">
            No comic episodes exist yet. Start by creating the project bible, then add your first
            season.
          </p>
        )}
      </section>
    </div>
  );
}
