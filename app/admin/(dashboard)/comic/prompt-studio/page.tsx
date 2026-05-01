import Link from "next/link";
import { AdminActionResultDialog } from "@/components/admin/admin-action-result-dialog";
import { ComicImageTaskQueueProvider } from "@/components/admin/comic-image-task-queue";
import { ComicPromptPageLists } from "@/components/admin/comic-prompt-page-lists";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { generateComicPromptPackageAction } from "@/app/admin/comic-prompt-actions";
import { parseComicPromptOutput } from "@/lib/comic-prompt-output";
import { getOpenAiComicSettings } from "@/lib/openai-comic";
import { getComicPromptStudioPage } from "@/lib/comic-queries";

type AdminComicPromptStudioPageProps = {
  searchParams: Promise<{ episodeId?: string; status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "prompt-generated": "Comic prompt package generated.",
  "prompt-failed": "Comic prompt generation failed. Check the latest prompt run and try again.",
  "page-image-generated": "Comic page image generated and saved as a draft episode asset.",
  "page-image-failed": "Comic page image generation failed. Check the latest prompt run entry for details.",
  "missing-episode": "Pick an episode before generating prompts.",
  "missing-page-prompt": "Generate a page-by-page prompt package before creating page images.",
  "missing-project": "Save the comic project bible first so the prompt workflow has canon context."
};

function buildImageResultMessages(errorMessage?: string | null) {
  return {
    "page-image-generated": {
      title: "Draft image created",
      description:
        "The generated comic page was saved as a draft asset. Review it in this episode or the Publish Center before approving.",
      tone: "success"
    },
    "page-image-failed": {
      title: "Draft image creation failed",
      description: errorMessage
        ? `OpenAI returned: ${errorMessage}`
        : "The image request did not complete. Open the latest prompt run entry for the stored error message and try again.",
      tone: "danger"
    },
    "missing-page-prompt": {
      title: "No page prompt found",
      description: "Generate a page-by-page prompt package before creating a draft image.",
      tone: "warning"
    },
    "missing-project": {
      title: "Comic project is missing",
      description: "Save the comic project bible first so the image workflow has canon context.",
      tone: "warning"
    }
  } as const;
}

export default async function AdminComicPromptStudioPage({
  searchParams
}: AdminComicPromptStudioPageProps) {
  const params = await searchParams;
  const episodeId = params.episodeId || null;
  const [pageData, openAiSettings] = await Promise.all([
    getComicPromptStudioPage(episodeId),
    Promise.resolve(getOpenAiComicSettings())
  ]);

  const selectedEpisode = pageData.selectedEpisode;
  const latestImageGenerationRun = selectedEpisode?.promptRuns.find(
    (run) => run.promptType === "PAGE_IMAGE_GENERATION"
  );
  const parsedPromptOutput = selectedEpisode
    ? parseComicPromptOutput(
        selectedEpisode.episode.promptPack,
        selectedEpisode.episode.requiredReferences
      )
    : null;

  return (
    <ComicImageTaskQueueProvider maxConcurrent={5}>
      <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Prompt Studio</p>
        <h1>Generate episode prompt packs with the locked cast and scene library.</h1>
        <p>
          Choose an episode, then let the model expand it into a 10-page comic plan with mostly
          3-panel pages, selectively 2-panel emphasis pages, plus direct-copy prompt blocks and an
          explicit upload checklist for <code>gpt-image-2</code>.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      <AdminActionResultDialog
        status={params.status}
        messages={buildImageResultMessages(latestImageGenerationRun?.errorMessage)}
      />

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Project</p>
          <h3>{pageData.project?.title || "No comic project saved yet"}</h3>
          <p>
            {pageData.project?.shortDescription ||
              "Save the comic project bible first so the model can read the same canon and visual rules every time."}
          </p>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Library</p>
          <h3>{pageData.characters.length} characters / {pageData.scenes.length} scenes</h3>
          <p>
            Only active characters and scenes are used when building prompt packages and reference
            upload checklists.
          </p>
        </section>

        <section className="admin-card">
          <p className="eyebrow">AI</p>
          <h3>{openAiSettings.model}</h3>
          <p>
            The prompt studio builds instructions for <code>{openAiSettings.imageModel}</code> so
            your image-generation workflow stays stable from panel to panel.
          </p>
        </section>
      </div>

      <section className="admin-form">
        <h2>Select an episode</h2>
        <form method="get" action="/admin/comic/prompt-studio">
          <div className="field">
            <label htmlFor="comic-prompt-episode">Episode</label>
            <select id="comic-prompt-episode" name="episodeId" defaultValue={episodeId || ""}>
              <option value="">Choose an episode...</option>
              {pageData.seasons.map((season) => (
                <optgroup key={season.id} label={`Season ${season.seasonNumber}: ${season.title}`}>
                  {season.chapters.map((chapter) =>
                    chapter.episodes.map((episode) => (
                      <option key={episode.id} value={episode.id}>
                        {chapter.title} / Episode {episode.episodeNumber}: {episode.title}
                      </option>
                    ))
                  )}
                </optgroup>
              ))}
            </select>
          </div>
          <button type="submit" className="button button--primary">
            Load episode
          </button>
        </form>
      </section>

      {selectedEpisode ? (
        <>
          <section className="admin-form">
            <div className="admin-review-pagination">
              <div>
                <h2>Selected episode</h2>
                <p className="form-note">
                  {selectedEpisode.season.title} {"->"} {selectedEpisode.chapter.title} {"->"}{" "}
                  {selectedEpisode.episode.title}
                </p>
              </div>
              <div className="stack-row">
                <Link href={`/admin/comic/episodes/${selectedEpisode.episode.id}`} className="button button--secondary">
                  Open episode editor
                </Link>
              </div>
            </div>

            <div className="cards-3">
              <div className="admin-card">
                <p className="eyebrow">Episode summary</p>
                <p>{selectedEpisode.episode.summary || "No summary added yet."}</p>
              </div>
              <div className="admin-card">
                <p className="eyebrow">Outline</p>
                <p>{selectedEpisode.episode.outline || "No outline added yet."}</p>
              </div>
              <div className="admin-card">
                <p className="eyebrow">Chapter scene pack</p>
                <h3>{selectedEpisode.chapterSceneReferences.length} scene refs</h3>
                <p>
                  Prompt generation will use the current chapter scene folder first whenever a panel
                  happens in a known Chapter {selectedEpisode.chapter.chapterNumber} location.
                </p>
                <p className="form-note">
                  <code>{selectedEpisode.chapterSceneReferenceFolder}</code>
                </p>
              </div>
            </div>

            {selectedEpisode.chapterSceneReferences.length > 0 ? (
              <div className="field">
                <label>Chapter scene refs to upload when relevant</label>
                <div className="stack-row">
                  {selectedEpisode.chapterSceneReferences.map((sceneReference) => (
                    <span key={sceneReference.relativePath} className="pill">
                      {sceneReference.fileName}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="form-note">
                No chapter-specific scene refs are stored yet. Add scene sheets under{" "}
                <code>{selectedEpisode.chapterSceneReferenceFolder}</code> to make the upload
                checklist more precise.
              </p>
            )}

            <form action={generateComicPromptPackageAction}>
              <input type="hidden" name="episodeId" value={selectedEpisode.episode.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/admin/comic/prompt-studio?episodeId=${selectedEpisode.episode.id}`}
              />
              <PendingSubmitButton
                idleLabel="Generate prompt package"
                pendingLabel="Generating prompt package..."
                modalTitle="Generating the comic prompt package"
                modalDescription="The model is turning this episode into a 10-page script pack, page-by-page prompts, and a gpt-image-2 upload checklist."
                disabled={!openAiSettings.ready || !pageData.project}
              />
            </form>
          </section>

          <section className="admin-form">
            <h2>Current prompt output</h2>
            <p className="form-note">
              The generated upload checklist now reads both the active scene library and the current
              chapter&apos;s stored scene pack.
            </p>
            <div className="field">
              <label>Script</label>
              <textarea rows={14} value={selectedEpisode.episode.script} readOnly />
            </div>
            <div className="field">
              <label>Panel / page plan</label>
              <textarea rows={12} value={selectedEpisode.episode.panelPlan} readOnly />
            </div>
          </section>

          {parsedPromptOutput ? (
            <ComicPromptPageLists
              episodeLogline={parsedPromptOutput.episodeLogline}
              episodeSynopsis={parsedPromptOutput.episodeSynopsis}
              promptPages={parsedPromptOutput.pages}
              globalGptImage2Notes={parsedPromptOutput.globalGptImage2Notes}
              episodeId={selectedEpisode.episode.id}
              redirectTo={`/admin/comic/prompt-studio?episodeId=${selectedEpisode.episode.id}`}
              showGenerateActions
            />
          ) : selectedEpisode.episode.promptPack || selectedEpisode.episode.requiredReferences ? (
            <section className="admin-form">
              <h2>Legacy prompt output</h2>
              <p className="form-note">
                This episode still uses the older prompt format. Regenerate the prompt package to
                get the new page-by-page comic workflow.
              </p>
              <div className="field">
                <label>Prompt pack</label>
                <textarea rows={16} value={selectedEpisode.episode.promptPack} readOnly />
              </div>
              <div className="field">
                <label>Required references and gpt-image-2 notes</label>
                <textarea rows={16} value={selectedEpisode.episode.requiredReferences} readOnly />
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="admin-form">
          <h2>No episode selected yet</h2>
          <p className="form-note">
            Choose an episode above to generate prompts. The studio will read the master comic
            bible, active characters, and active scenes once an episode is selected.
          </p>
        </section>
      )}
      </div>
    </ComicImageTaskQueueProvider>
  );
}
