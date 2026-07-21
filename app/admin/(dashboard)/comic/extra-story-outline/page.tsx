import Link from "next/link";
import {
  createComicExtraStoryOutlineAction,
  deleteComicExtraStoryAction,
  updateComicExtraStoryOutlineAction
} from "@/app/admin/comic-extra-story-actions";
import { ComicExtraStoryOutlineRevisionForm } from "@/components/admin/comic-extra-story-outline-revision-form";
import { ComicImageTaskQueueProvider } from "@/components/admin/comic-image-task-queue";
import { parseComicBilingualText } from "@/lib/comic-bilingual-outline";
import { getComicExtraStoryOutlinePage } from "@/lib/comic-queries";
import { formatDate } from "@/lib/format";
import { getApiYiComicSettings } from "@/lib/openai-comic";

type AdminComicExtraStoryOutlinePageProps = {
  searchParams: Promise<{ status?: string; storyId?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "extra-story-created": "Extra story outline generated.",
  "extra-story-outline-queued":
    "Extra story draft was created and outline generation was added to Comic tasks.",
  "extra-story-outline-generated": "Extra story outline generated.",
  "extra-story-created-outline-failed":
    "Extra story draft was created, but AI outline generation failed. You can edit the outline manually and regenerate prompts in Publish Center.",
  "extra-story-deleted": "Extra story deleted.",
  "extra-story-saved": "Extra story outline saved.",
  "missing-parent-episode": "Choose the main episode this extra story should follow.",
  "missing-extra-story-request": "Enter the extra-story request first.",
  "missing-extra-story": "That extra story could not be found."
};

function parentEpisodeLabel(
  episode: Awaited<ReturnType<typeof getComicExtraStoryOutlinePage>>["parentEpisodes"][number]
) {
  return `Episode ${episode.episodeNumber}: ${episode.title}`;
}

function ExtraStoryBilingualPreview({ outline }: { outline: string }) {
  const outlineText = parseComicBilingualText(outline);

  return (
    <div className="admin-comic-outline-bilingual admin-comic-outline-bilingual--bounded">
      <section className="admin-comic-outline-language-pane">
        <div className="admin-comic-outline-language-pane__header">
          <strong>Chinese</strong>
        </div>
        <pre>{outlineText.zh || outline}</pre>
      </section>
      <section className="admin-comic-outline-language-pane">
        <div className="admin-comic-outline-language-pane__header">
          <strong>English</strong>
        </div>
        <pre>{outlineText.en || "No English version yet."}</pre>
      </section>
    </div>
  );
}

export default async function AdminComicExtraStoryOutlinePage({
  searchParams
}: AdminComicExtraStoryOutlinePageProps) {
  const [pageData, params, apiYiSettings] = await Promise.all([
    getComicExtraStoryOutlinePage(),
    searchParams,
    Promise.resolve(getApiYiComicSettings())
  ]);
  const selectedStory =
    pageData.extraStories.find((story) => story.id === params.storyId) ||
    pageData.extraStories[0] ||
    null;

  return (
    <ComicImageTaskQueueProvider maxConcurrent={5}>
      <div className="admin-page admin-page--comic-outline">
        <div className="stack-row">
          <Link href="/admin/comic" className="button button--secondary">
            Back to comic
          </Link>
          <Link href="/admin/comic/extra-story-publish-center" className="button button--ghost">
            Extra-Story Publish Center
          </Link>
          <Link href="/admin/comic/product-locks" className="button button--ghost">
            Product Locks
          </Link>
        </div>

        <div className="admin-page__header">
          <p className="eyebrow">Comic / Extra-Story Outline</p>
          <h1>Create side-story outlines from a short request.</h1>
          <p>
            Extra stories use the same character locks, scene locks, product locks, prompt package,
            image generation, approval, and publishing flow as the main comic. Choose the main
            episode it should appear after, then generate the side-story outline.
          </p>
        </div>

        {params.status ? (
          <p className="notice">
            {STATUS_MESSAGES[params.status] || `Extra-story action completed: ${params.status}.`}
          </p>
        ) : null}

        <div className="cards-3">
          <section className="admin-card">
            <p className="eyebrow">Main episodes</p>
            <h3>{pageData.parentEpisodes.length}</h3>
            <p>Available placement points for extra stories.</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Extra stories</p>
            <h3>{pageData.extraStories.length}</h3>
            <p>Draft or published side-story episodes.</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">AI model</p>
            <h3>{apiYiSettings.model}</h3>
            <p>{apiYiSettings.ready ? "APIYI key is configured." : "Set APIYI_API_KEY first."}</p>
          </section>
        </div>

        <div className="admin-comic-outline-layout">
          <aside className="admin-form admin-comic-outline-nav">
            <h2>Extra stories</h2>
            <nav aria-label="Extra story outline list">
              {pageData.extraStories.length > 0 ? (
                pageData.extraStories.map((story) => (
                  <Link
                    key={story.id}
                    href={`/admin/comic/extra-story-outline?storyId=${story.id}`}
                    className={selectedStory?.id === story.id ? "is-active" : undefined}
                  >
                    {story.title}
                  </Link>
                ))
              ) : (
                <span className="form-note">No extra story yet.</span>
              )}
            </nav>
          </aside>

          <div className="admin-comic-outline-stack">
            <section className="admin-form">
              <h2>Generate a new extra story</h2>
              <div className="admin-comic-extra-story-memo">
                <strong>Extra-story AI memo</strong>
                <p>
                  Focus the story on product functions, use cases, texture or feel, audience fit,
                  and practical benefit points. The tone can be softly promotional and useful, but
                  should still read like a light comic scene rather than a hard ad.
                </p>
              </div>
              <form action={createComicExtraStoryOutlineAction} className="admin-comic-copy-grid">
                <div className="field">
                  <label htmlFor="parentEpisodeId">Publish after</label>
                  <select id="parentEpisodeId" name="parentEpisodeId" required>
                    <option value="">Choose a main episode</option>
                    {pageData.parentEpisodes.map((episode) => (
                      <option key={episode.id} value={episode.id}>
                        {parentEpisodeLabel(episode)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="title">Optional title</label>
                  <input id="title" name="title" placeholder="Extra Story: Muci tries SE96" />
                </div>
                <div className="field">
                  <label htmlFor="extraStoryPlacementOrder">Placement order</label>
                  <input
                    id="extraStoryPlacementOrder"
                    name="extraStoryPlacementOrder"
                    type="number"
                    min={0}
                    defaultValue={0}
                  />
                </div>
                <div className="field admin-comic-field--full">
                  <label htmlFor="userRequest">Your extra-story request</label>
                  <textarea
                    id="userRequest"
                    name="userRequest"
                    rows={10}
                    required
                    placeholder="Example: make a Muci and Padaruna extra story for SE96. Readers should understand how to use it, but it should not feel like a hard ad."
                  />
                </div>
                <div className="admin-comic-form-actions">
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={!apiYiSettings.ready || pageData.parentEpisodes.length === 0}
                  >
                    Generate extra-story outline
                  </button>
                </div>
              </form>
            </section>

            {selectedStory ? (
              <section className="admin-form admin-comic-extra-story-editor">
                <div className="admin-review-pagination">
                  <div>
                    <p className="eyebrow">
                      {selectedStory.parentEpisodeNumber
                        ? `After Episode ${selectedStory.parentEpisodeNumber}`
                        : "Placement not set"}
                    </p>
                    <h2>{selectedStory.title}</h2>
                    <p className="form-note">
                      {selectedStory.published ? "Published" : "Draft"} / updated{" "}
                      {formatDate(selectedStory.updatedAt)}
                    </p>
                  </div>
                  <div className="stack-row">
                    <Link
                      href={`/admin/comic/extra-story-publish-center#episode-${selectedStory.id}`}
                      className="button button--primary"
                    >
                      Open Publish Center
                    </Link>
                    <form action={deleteComicExtraStoryAction}>
                      <input type="hidden" name="episodeId" value={selectedStory.id} />
                      <input
                        type="hidden"
                        name="redirectTo"
                        value="/admin/comic/extra-story-outline"
                      />
                      <button type="submit" className="button button--danger">
                        Delete extra story
                      </button>
                    </form>
                  </div>
                </div>

                <form
                  action={updateComicExtraStoryOutlineAction}
                  className="admin-comic-extra-story-edit-form"
                >
                  <input type="hidden" name="episodeId" value={selectedStory.id} />
                  <div className="field">
                    <label htmlFor={`story-title-${selectedStory.id}`}>Title</label>
                    <input
                      id={`story-title-${selectedStory.id}`}
                      name="title"
                      defaultValue={selectedStory.title}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`story-summary-${selectedStory.id}`}>Summary</label>
                    <textarea
                      id={`story-summary-${selectedStory.id}`}
                      name="summary"
                      rows={5}
                      defaultValue={selectedStory.summary}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`story-outline-${selectedStory.id}`}>Outline</label>
                    <textarea
                      id={`story-outline-${selectedStory.id}`}
                      name="outline"
                      rows={18}
                      defaultValue={selectedStory.outline}
                      required
                    />
                  </div>

                  <div className="admin-comic-outline-preview">
                    <div>
                      <p className="eyebrow">Current bilingual version</p>
                      <h3>Preview before saving</h3>
                    </div>
                    <ExtraStoryBilingualPreview outline={selectedStory.outline} />
                  </div>

                  <div className="admin-comic-form-actions">
                    <button type="submit" className="button button--primary">
                      Save outline
                    </button>
                  </div>
                </form>

                <div className="admin-comic-extra-story-memo admin-comic-extra-story-revision">
                  <strong>Continue revising with AI</strong>
                  <p>
                    Write what should change, then queue another AI pass. The revision keeps the
                    product-function memo and rewrites this extra-story outline.
                  </p>
                  <ComicExtraStoryOutlineRevisionForm
                    episodeId={selectedStory.id}
                    episodeTitle={selectedStory.title}
                    disabled={!apiYiSettings.ready}
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </ComicImageTaskQueueProvider>
  );
}
