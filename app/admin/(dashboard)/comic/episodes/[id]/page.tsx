import Link from "next/link";
import { notFound } from "next/navigation";
import { ComicPromptPageLists } from "@/components/admin/comic-prompt-page-lists";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import {
  createComicEpisodeAssetAction,
  deleteComicEpisodeAssetAction,
  updateComicEpisodeAction,
  updateComicEpisodeAssetAction
} from "@/app/admin/comic-editor-actions";
import { generateComicPromptPackageAction } from "@/app/admin/comic-prompt-actions";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { formatDate, formatTime } from "@/lib/format";
import { getComicEpisodeById } from "@/lib/comic-queries";

type AdminComicEpisodeDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Episode created.",
  saved: "Episode updated.",
  "asset-created": "Comic asset created.",
  "asset-saved": "Comic asset updated.",
  "asset-deleted": "Comic asset deleted.",
  "prompt-generated": "A fresh comic prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Check the latest prompt run entry below.",
  "page-image-generated": "Comic page image generated and saved as a draft asset.",
  "page-image-failed": "Comic page image generation failed. Check the latest prompt run entry below.",
  "missing-fields": "Fill in the required episode fields before saving.",
  "missing-asset-fields": "Add an asset title and image URL before saving.",
  "missing-page-prompt": "Generate a page-by-page prompt package before creating page images."
};

export default async function AdminComicEpisodeDetailPage({
  params,
  searchParams
}: AdminComicEpisodeDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const episodePage = await getComicEpisodeById(id);

  if (!episodePage) {
    notFound();
  }

  const {
    project,
    season,
    chapter,
    episode,
    assets,
    promptRuns,
    characters,
    scenes,
    chapterSceneReferenceFolder,
    chapterSceneReferences
  } = episodePage;
  const parsedEpisodePromptOutput = parseComicPromptOutput(
    episode.promptPack,
    episode.requiredReferences
  );
  const nextAssetSortOrder =
    assets.length > 0 ? Math.max(...assets.map((asset) => asset.sortOrder)) + 1 : 1;

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href={`/admin/comic/chapters/${chapter.id}`} className="button button--secondary">
          Back to chapter
        </Link>
        <Link
          href={`/admin/comic/prompt-studio?episodeId=${episode.id}`}
          className="button button--ghost"
        >
          Open prompt studio
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Episodes</p>
        <h1>Edit {episode.title}.</h1>
        <p>
          This is the production hub for one episode: story summary, outline, script, panel plan,
          prompt pack, required image references, and final comic page assets.
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
        </p>
      ) : null}

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Story path</p>
          <h3>{season.title}</h3>
          <p>
            {chapter.title} {"->"} {episode.title}
          </p>
          <div className="stack-row">
            <span className="pill">Season {season.seasonNumber}</span>
            <span className="pill">Chapter {chapter.chapterNumber}</span>
            <span className="pill">Episode {episode.episodeNumber}</span>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Canon loaded</p>
          <h3>{project?.title || "No project saved yet"}</h3>
          <p>
            Prompt generation currently has access to {characters.length} active characters and{" "}
            {scenes.length} active scenes, plus {chapterSceneReferences.length} chapter scene refs.
          </p>
          <div className="stack-row">
            <span className="pill">{characters.length} characters</span>
            <span className="pill">{scenes.length} scenes</span>
            <span className="pill">{chapterSceneReferences.length} chapter scene refs</span>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Production state</p>
          <h3>{assets.length} comic assets</h3>
          <p>
            {promptRuns.length > 0
              ? `Latest prompt run: ${promptRuns[0].status} on ${formatDate(promptRuns[0].createdAt)}.`
              : "No prompt generation has been run yet."}
          </p>
          <div className="stack-row">
            <span className="pill">{episode.published ? "Published" : "Draft"}</span>
            <span className="pill">{promptRuns.length} prompt runs</span>
          </div>
        </section>
      </div>

      <section className="admin-form">
        <h2>Chapter scene pack</h2>
        <p className="form-note">
          Store chapter-only environment sheets here and upload the relevant ones when generating
          with <code>gpt-image-2</code>.
        </p>
        <div className="field">
          <label>Chapter scene folder</label>
          <input value={chapterSceneReferenceFolder} readOnly />
        </div>
        {chapterSceneReferences.length > 0 ? (
          <div className="stack-row">
            {chapterSceneReferences.map((sceneReference) => (
              <span key={sceneReference.relativePath} className="pill">
                {sceneReference.fileName}
              </span>
            ))}
          </div>
        ) : (
          <p className="form-note">
            No chapter scene refs stored yet. Add scene drawings to this chapter folder to make the
            AI upload checklist more specific.
          </p>
        )}
      </section>

      <section className="admin-form">
        <h2>Episode settings</h2>
        <form action={updateComicEpisodeAction}>
          <input type="hidden" name="id" value={episode.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-episode-number">Episode number</label>
              <input
                id="comic-episode-number"
                name="episodeNumber"
                type="number"
                min="1"
                defaultValue={episode.episodeNumber}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-title">Episode title</label>
              <input id="comic-episode-title" name="title" defaultValue={episode.title} required />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-slug">Slug</label>
              <input id="comic-episode-slug" name="slug" defaultValue={episode.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-sort-order">Sort order</label>
              <input
                id="comic-episode-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={episode.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" defaultChecked={episode.published} />
            Publish this episode
          </label>

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-episode-cover-image">Cover image URL</label>
              <input
                id="comic-episode-cover-image"
                name="coverImageUrl"
                defaultValue={episode.coverImageUrl || ""}
              />
            </div>
            <div className="field">
              <label htmlFor="comic-episode-cover-alt">Cover image alt</label>
              <input
                id="comic-episode-cover-alt"
                name="coverImageAlt"
                defaultValue={episode.coverImageAlt || ""}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="comic-episode-summary">Episode summary</label>
            <textarea id="comic-episode-summary" name="summary" rows={5} defaultValue={episode.summary} />
          </div>

          <div className="field">
            <label htmlFor="comic-episode-outline">Episode outline</label>
            <textarea id="comic-episode-outline" name="outline" rows={8} defaultValue={episode.outline} />
          </div>

          <div className="field">
            <label htmlFor="comic-episode-script">Episode script</label>
            <textarea id="comic-episode-script" name="script" rows={14} defaultValue={episode.script} />
          </div>

          <div className="field">
            <label htmlFor="comic-episode-panel-plan">Panel / page plan</label>
            <textarea
              id="comic-episode-panel-plan"
              name="panelPlan"
              rows={12}
              defaultValue={episode.panelPlan}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-episode-prompt-pack">Prompt pack</label>
            <textarea
              id="comic-episode-prompt-pack"
              name="promptPack"
              rows={8}
              defaultValue={episode.promptPack}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-episode-required-refs">Required references and gpt-image-2 notes</label>
            <textarea
              id="comic-episode-required-refs"
              name="requiredReferences"
              rows={8}
              defaultValue={episode.requiredReferences}
            />
          </div>

          <button type="submit" className="button button--primary">
            Save episode
          </button>
        </form>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Generate a fresh prompt package</h2>
            <p className="form-note">
              This will read the project bible, active characters, active scenes, and the selected
              episode outline, plus the current chapter scene pack, then write back a script, page
              plan, prompt pack, and upload checklist for <code>gpt-image-2</code>.
            </p>
          </div>
        </div>

        <form action={generateComicPromptPackageAction}>
          <input type="hidden" name="episodeId" value={episode.id} />
          <input type="hidden" name="redirectTo" value={`/admin/comic/episodes/${episode.id}`} />
          <PendingSubmitButton
            idleLabel="Generate comic prompt package"
            pendingLabel="Generating comic prompts..."
            modalTitle="Building the episode prompt package"
            modalDescription="The system is reading the project bible, character locks, and scene locks, then writing a fresh script, panel plan, and gpt-image-2 upload checklist."
          />
        </form>
      </section>

      {parsedEpisodePromptOutput ? (
        <ComicPromptPageLists
          episodeLogline={parsedEpisodePromptOutput.episodeLogline}
          episodeSynopsis={parsedEpisodePromptOutput.episodeSynopsis}
          promptPages={parsedEpisodePromptOutput.pages}
          globalGptImage2Notes={parsedEpisodePromptOutput.globalGptImage2Notes}
          episodeId={episode.id}
          redirectTo={`/admin/comic/episodes/${episode.id}`}
          showGenerateActions
        />
      ) : null}

      <section className="admin-form">
        <h2>Add a comic asset</h2>
        <form action={createComicEpisodeAssetAction}>
          <input type="hidden" name="episodeId" value={episode.id} />
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-asset-type">Asset type</label>
              <input id="comic-asset-type" name="assetType" defaultValue="PAGE" />
            </div>
            <div className="field">
              <label htmlFor="comic-asset-title">Title</label>
              <input id="comic-asset-title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="comic-asset-sort-order">Sort order</label>
              <input
                id="comic-asset-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={nextAssetSortOrder}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="comic-asset-image-url">Image URL</label>
            <input id="comic-asset-image-url" name="imageUrl" required />
          </div>

          <div className="field">
            <label htmlFor="comic-asset-alt">Alt text</label>
            <input id="comic-asset-alt" name="altText" />
          </div>

          <div className="field">
            <label htmlFor="comic-asset-caption">Caption</label>
            <textarea id="comic-asset-caption" name="caption" rows={4} />
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="published" defaultChecked />
            Published asset
          </label>

          <button type="submit" className="button button--primary">
            Add comic asset
          </button>
        </form>
      </section>

      <section className="admin-form admin-table">
        <h2>Comic assets</h2>
        {assets.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{asset.title}</strong>
                        <span className="form-note">{asset.altText || "No alt text yet"}</span>
                      </div>
                    </td>
                    <td>{asset.assetType}</td>
                    <td>{asset.sortOrder}</td>
                    <td>
                      <span
                        className={`admin-table__status-badge ${
                          asset.published
                            ? "admin-table__status-badge--success"
                            : "admin-table__status-badge--warning"
                        }`}
                      >
                        {asset.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <a href={asset.imageUrl} target="_blank" rel="noreferrer" className="link-inline">
                        Open image
                      </a>
                    </td>
                    <td>
                      <details>
                        <summary className="admin-details-summary">Edit asset</summary>
                        <div className="admin-order-row__details">
                          <form action={updateComicEpisodeAssetAction} className="admin-form">
                            <input type="hidden" name="id" value={asset.id} />
                            <div className="admin-form__grid">
                              <div className="field">
                                <label htmlFor={`asset-title-${asset.id}`}>Title</label>
                                <input id={`asset-title-${asset.id}`} name="title" defaultValue={asset.title} required />
                              </div>
                              <div className="field">
                                <label htmlFor={`asset-type-${asset.id}`}>Type</label>
                                <input id={`asset-type-${asset.id}`} name="assetType" defaultValue={asset.assetType} />
                              </div>
                              <div className="field">
                                <label htmlFor={`asset-sort-${asset.id}`}>Sort order</label>
                                <input
                                  id={`asset-sort-${asset.id}`}
                                  name="sortOrder"
                                  type="number"
                                  min="0"
                                  defaultValue={asset.sortOrder}
                                />
                              </div>
                            </div>
                            <div className="field">
                              <label htmlFor={`asset-url-${asset.id}`}>Image URL</label>
                              <input id={`asset-url-${asset.id}`} name="imageUrl" defaultValue={asset.imageUrl} required />
                            </div>
                            <div className="field">
                              <label htmlFor={`asset-alt-${asset.id}`}>Alt text</label>
                              <input id={`asset-alt-${asset.id}`} name="altText" defaultValue={asset.altText || ""} />
                            </div>
                            <div className="field">
                              <label htmlFor={`asset-caption-${asset.id}`}>Caption</label>
                              <textarea
                                id={`asset-caption-${asset.id}`}
                                name="caption"
                                rows={3}
                                defaultValue={asset.caption || ""}
                              />
                            </div>
                            <label className="field field--checkbox">
                              <input type="checkbox" name="published" defaultChecked={asset.published} />
                              Published asset
                            </label>
                            <button type="submit" className="button button--primary">
                              Save asset
                            </button>
                          </form>
                          <form action={deleteComicEpisodeAssetAction}>
                            <input type="hidden" name="id" value={asset.id} />
                            <button type="submit" className="button button--ghost">
                              Delete asset
                            </button>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">
            No comic assets yet. Add published page images here when an episode is ready for the
            frontend.
          </p>
        )}
      </section>

      <section className="admin-form admin-table">
        <h2>Prompt run history</h2>
        {promptRuns.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Model</th>
                  <th>Summary</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {promptRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      {formatDate(run.createdAt)} {formatTime(run.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`admin-table__status-badge ${
                          run.status === "READY" || run.status === "APPROVED"
                            ? "admin-table__status-badge--success"
                            : run.status === "FAILED"
                              ? "admin-table__status-badge--danger"
                              : "admin-table__status-badge--warning"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <span>{run.model}</span>
                        <span className="form-note">{run.imageModel || "No image model set"}</span>
                      </div>
                    </td>
                    <td>{run.outputSummary}</td>
                    <td>
                      <details>
                        <summary className="admin-details-summary">Open details</summary>
                        <div className="admin-order-row__details">
                          <div className="field">
                            <label>Input context</label>
                            <textarea rows={10} value={run.inputContext} readOnly />
                          </div>
                          {run.promptPack || run.referenceChecklist ? (
                            (() => {
                              const parsedRunPromptOutput = parseComicPromptOutput(
                                run.promptPack || "",
                                run.referenceChecklist || ""
                              );

                              return parsedRunPromptOutput ? (
                                <ComicPromptPageLists
                                  episodeLogline={parsedRunPromptOutput.episodeLogline}
                                  episodeSynopsis={parsedRunPromptOutput.episodeSynopsis}
                                  promptPages={parsedRunPromptOutput.pages}
                                  globalGptImage2Notes={parsedRunPromptOutput.globalGptImage2Notes}
                                />
                              ) : (
                                <>
                                  {run.promptPack ? (
                                    <div className="field">
                                      <label>Prompt pack JSON</label>
                                      <textarea rows={14} value={run.promptPack} readOnly />
                                    </div>
                                  ) : null}
                                  {run.referenceChecklist ? (
                                    <div className="field">
                                      <label>Reference checklist</label>
                                      <textarea rows={14} value={run.referenceChecklist} readOnly />
                                    </div>
                                  ) : null}
                                </>
                              );
                            })()
                          ) : null}
                          {run.errorMessage ? (
                            <div className="field">
                              <label>Error</label>
                              <textarea rows={6} value={run.errorMessage} readOnly />
                            </div>
                          ) : null}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">No prompt history yet. Generate the first prompt package above.</p>
        )}
      </section>
    </div>
  );
}
