import Link from "next/link";
import { ComicImageTaskQueueProvider } from "@/components/admin/comic-image-task-queue";
import { ComicPublishEpisodeDetails } from "@/components/admin/comic-publish-episode-details";
import { ComicPublishEpisodeProductionPanel } from "@/components/admin/comic-publish-episode-production-panel";
import { updateComicExtraStoryPlacementAction } from "@/app/admin/comic-extra-story-actions";
import { getComicExtraStoryPublishCenter } from "@/lib/comic-queries";

type AdminComicExtraStoryPublishCenterPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "extra-story-placement-saved": "Extra story placement saved.",
  "missing-extra-story-placement": "Choose both an extra story and the main episode it should follow.",
  "prompt-generated": "A fresh cover-plus-10-page prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Check the episode prompt run history.",
  "page-image-generated": "Comic page image generated and saved as a draft asset.",
  "page-image-failed": "Comic page image generation failed. Check the episode prompt run history.",
  "page-edit-created": "Comic page edit saved as a new draft candidate.",
  "page-edit-failed": "Comic page edit failed. Check the episode prompt run history.",
  "page-approved": "Comic page approved.",
  "page-unapproved": "Comic page approval was removed.",
  "page-uploaded": "Comic page image uploaded as a draft.",
  "page-uploaded-approved": "Comic page image uploaded and approved.",
  "episode-published": "Extra story published to the public comic library.",
  "episode-unpublished": "Extra story unpublished."
};

function parentEpisodeLabel(
  episode: Awaited<ReturnType<typeof getComicExtraStoryPublishCenter>>["parentEpisodes"][number]
) {
  return `Episode ${episode.episodeNumber}: ${episode.title}`;
}

export default async function AdminComicExtraStoryPublishCenterPage({
  searchParams
}: AdminComicExtraStoryPublishCenterPageProps) {
  const [publishCenter, params] = await Promise.all([
    getComicExtraStoryPublishCenter(),
    searchParams
  ]);

  return (
    <ComicImageTaskQueueProvider maxConcurrent={5}>
      <div className="admin-page admin-page--comic-publish">
        <div className="stack-row">
          <Link href="/admin/comic" className="button button--secondary">
            Back to comic
          </Link>
          <Link href="/admin/comic/extra-story-outline" className="button button--ghost">
            Extra-Story Outline
          </Link>
          <Link href="/admin/comic/product-locks" className="button button--ghost">
            Product Locks
          </Link>
        </div>

        <div className="admin-page__header">
          <p className="eyebrow">Comic / Extra-Story Publish Center</p>
          <h1>Produce and publish extra stories.</h1>
          <p>
            Extra stories use the same prompt package, image generation, upload, approval, Chinese
            version, download, and publish controls as normal episodes. The placement setting
            decides which public episode the extra story appears after.
          </p>
        </div>

        {params.status ? (
          <p className="notice">
            {STATUS_MESSAGES[params.status] || `Extra-story action completed: ${params.status}.`}
          </p>
        ) : null}

        <div className="cards-3">
          <section className="admin-card">
            <p className="eyebrow">Extra-story pipeline</p>
            <h3>{publishCenter.episodeCount}</h3>
            <p>{publishCenter.readyEpisodeCount} extra stories are ready to publish.</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Published</p>
            <h3>{publishCenter.publishedEpisodeCount}</h3>
            <p>Published extra stories appear after their selected main episode.</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Draft images</p>
            <h3>{publishCenter.draftAssetCount}</h3>
            <p>Generated and uploaded candidates stay private until approved.</p>
          </section>
        </div>

        {publishCenter.extraStories.length > 0 ? (
          <div className="admin-comic-publish-stack">
            {publishCenter.extraStories.map((episode) => {
              const redirectTo = `/admin/comic/extra-story-publish-center#episode-${episode.id}`;

              return (
                <ComicPublishEpisodeDetails
                  key={episode.id}
                  id={`episode-${episode.id}`}
                  storageKey={`neatique:comic-extra-story-publish-center:episode:${episode.id}:open`}
                  episodeNumber={episode.episodeNumber}
                  title={episode.title}
                  summary={episode.summary}
                  published={episode.published}
                  englishApprovedCount={episode.approvedPageCount}
                  chineseApprovedCount={episode.approvedChinesePageCount}
                  requiredPageCount={episode.requiredPageCount}
                  draftPageCount={episode.draftPageCount}
                  hasPromptPackage={Boolean(episode.promptPack?.trim())}
                >
                  <section className="admin-comic-health-summary">
                    <div>
                      <h3>Public placement</h3>
                      <p className="form-note">
                        Current:{" "}
                        {episode.parentEpisodeNumber
                          ? `after Episode ${episode.parentEpisodeNumber}: ${episode.parentEpisodeTitle}`
                          : "not placed yet"}
                      </p>
                    </div>
                    <form action={updateComicExtraStoryPlacementAction} className="stack-row">
                      <input type="hidden" name="episodeId" value={episode.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <label className="field">
                        <span>Publish after</span>
                        <select
                          name="parentEpisodeId"
                          defaultValue={episode.extraStoryParentEpisodeId || ""}
                          required
                        >
                          <option value="">Choose episode</option>
                          {publishCenter.parentEpisodes.map((parentEpisode) => (
                            <option key={parentEpisode.id} value={parentEpisode.id}>
                              {parentEpisodeLabel(parentEpisode)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Order</span>
                        <input
                          name="extraStoryPlacementOrder"
                          type="number"
                          min={0}
                          defaultValue={episode.extraStoryPlacementOrder}
                        />
                      </label>
                      <button type="submit" className="button button--secondary">
                        Save placement
                      </button>
                    </form>
                  </section>

                  <ComicPublishEpisodeProductionPanel
                    chapterId={episode.chapterId}
                    episodeId={episode.id}
                    episodeTitle={episode.title}
                    episodePublished={episode.published}
                    redirectTo={redirectTo}
                    outlineHref={`/admin/comic/extra-story-outline?storyId=${episode.id}`}
                  />
                </ComicPublishEpisodeDetails>
              );
            })}
          </div>
        ) : (
          <section className="admin-form">
            <h2>No extra stories yet</h2>
            <p className="form-note">
              Generate an extra-story outline first, then return here to make its pages.
            </p>
            <Link href="/admin/comic/extra-story-outline" className="button button--primary">
              Create extra story
            </Link>
          </section>
        )}
      </div>
    </ComicImageTaskQueueProvider>
  );
}
