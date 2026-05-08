import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminActionResultDialog } from "@/components/admin/admin-action-result-dialog";
import { ComicImageTaskQueueProvider } from "@/components/admin/comic-image-task-queue";
import { ComicPublishEpisodeDetails } from "@/components/admin/comic-publish-episode-details";
import { ComicPublishEpisodeProductionPanel } from "@/components/admin/comic-publish-episode-production-panel";
import { getComicPublishCenter } from "@/lib/comic-queries";
import type {
  ComicPublishCenterChapterRecord,
  ComicPublishCenterSeasonRecord
} from "@/lib/types";

type AdminComicPublishChapterPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "page-approved": "Comic page approved.",
  "page-unapproved": "Comic page approval was removed.",
  "page-rejected": "Comic page image was rejected and deleted.",
  "page-chinese-created": "Chinese comic page draft created. Approve it before it appears on the public Chinese page.",
  "page-chinese-approved": "Chinese comic page approved.",
  "page-chinese-unapproved": "Chinese comic page approval was removed.",
  "page-chinese-failed": "Chinese comic page version creation failed. Check the episode prompt run history.",
  "episode-published": "Episode published to the public comic library.",
  "episode-unpublished": "Episode unpublished. Approved pages are still saved, but the episode is hidden from the public comic library.",
  "unpublish-before-approval-change": "Unpublish this episode before removing or deleting an approved comic page.",
  "prompt-generated": "A fresh cover-plus-10-page prompt package is ready.",
  "prompt-failed": "Comic prompt generation failed. Check the episode prompt run history.",
  "page-image-generated": "Comic page image generated and saved as a draft asset.",
  "page-image-failed": "Comic page image generation failed. Check the episode prompt run history.",
  "page-edit-created": "Comic page edit saved as a new draft candidate.",
  "page-edit-failed": "Comic page edit failed. Check the episode prompt run history.",
  "page-uploaded": "Comic page image uploaded as a draft.",
  "page-uploaded-approved": "Comic page image uploaded and approved.",
  "page-prompt-revised": "Comic page prompt updated.",
  "page-prompt-restored": "Comic page prompt restored from history.",
  "page-prompt-revision-failed": "Comic page prompt revision failed. Check the episode prompt run history.",
  "prompt-qa-neglected": "Prompt QA item ignored. Matching QA findings will pass by default.",
  "missing-prompt-qa-finding": "That Prompt QA item could not be ignored.",
  "missing-approved-pages": "Approve the cover plus pages 1-10 before publishing this episode.",
  "missing-approved-page": "Approve an English page image before creating a Chinese version.",
  "missing-asset": "That comic page asset could not be found.",
  "missing-source-image": "This page image does not have stored image data for AI editing.",
  "missing-upload": "Choose an image file before uploading.",
  "invalid-page-number": "Choose the cover or a story page from 1 to 10 before uploading.",
  "upload-too-large": "Comic page uploads must stay under 20MB.",
  "upload-type": "Upload PNG, JPG, WEBP, or AVIF images only.",
  "missing-prompt-suggestion": "Enter a prompt suggestion before updating this page prompt.",
  "missing-page-edit-instruction": "Enter an edit instruction before editing this page image.",
  "missing-page-prompt": "Generate a page-by-page prompt package before creating page images.",
  "missing-prompt-revision": "That prompt revision history entry could not be restored."
};

type ChapterMatch = {
  season: ComicPublishCenterSeasonRecord;
  chapter: ComicPublishCenterChapterRecord;
};

function buildImageResultMessages(errorMessage?: string | null) {
  return {
    "page-image-generated": {
      title: "Draft image created",
      description:
        "The generated page image is now saved as a draft candidate on this episode. Review it here, then approve it when it is ready.",
      tone: "success"
    },
    "page-image-failed": {
      title: "Draft image creation failed",
      description: errorMessage
        ? `OpenAI returned: ${errorMessage}`
        : "The image request did not complete. Open the episode editor and check the latest prompt run entry for the stored error message.",
      tone: "danger"
    },
    "page-edit-created": {
      title: "Page edit created",
      description:
        "The edited page image is saved as a new draft candidate. Review it here, then approve it if it is the best version.",
      tone: "success"
    },
    "page-edit-failed": {
      title: "Page edit failed",
      description: errorMessage
        ? `OpenAI returned: ${errorMessage}`
        : "The page image edit did not complete. Open the episode editor and check the latest prompt run entry for the stored error message.",
      tone: "danger"
    },
    "page-uploaded": {
      title: "Page uploaded",
      description:
        "The uploaded page is saved as a draft candidate. Review it here, then approve it when it is ready.",
      tone: "success"
    },
    "page-uploaded-approved": {
      title: "Page uploaded and approved",
      description:
        "The uploaded page is now the approved English image for this page. Any previous Chinese version for this page was cleared for review.",
      tone: "success"
    },
    "missing-upload": {
      title: "No upload selected",
      description: "Choose a PNG, JPG, WEBP, or AVIF image before uploading.",
      tone: "warning"
    },
    "invalid-page-number": {
      title: "Invalid page slot",
      description: "Choose the cover or a story page from 1 to 10 before uploading.",
      tone: "warning"
    },
    "upload-too-large": {
      title: "Upload is too large",
      description: "Comic page uploads must stay under 20MB.",
      tone: "warning"
    },
    "upload-type": {
      title: "Unsupported image type",
      description: "Upload PNG, JPG, WEBP, or AVIF images only.",
      tone: "warning"
    },
    "missing-page-prompt": {
      title: "No page prompt found",
      description: "Generate the episode's cover-plus-10-page prompt package before creating a draft image.",
      tone: "warning"
    },
    "missing-project": {
      title: "Comic project is missing",
      description: "Save the comic project bible first so the image workflow has canon context.",
      tone: "warning"
    }
  } as const;
}

function getChapterMatch(
  seasons: ComicPublishCenterSeasonRecord[],
  chapterId: string
): ChapterMatch | null {
  for (const season of seasons) {
    const chapter = season.chapters.find((candidate) => candidate.id === chapterId);

    if (chapter) {
      return { season, chapter };
    }
  }

  return null;
}

export default async function AdminComicPublishChapterPage({
  params,
  searchParams
}: AdminComicPublishChapterPageProps) {
  const [{ id }, query, publishCenter] = await Promise.all([
    params,
    searchParams,
    getComicPublishCenter()
  ]);
  const match = getChapterMatch(publishCenter.seasons, id);

  if (!match) {
    notFound();
  }

  const { season, chapter } = match;
  const requiredPageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.requiredPageCount,
    0
  );
  const approvedPageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.approvedPageCount,
    0
  );
  const approvedChinesePageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.approvedChinesePageCount,
    0
  );
  const readyEpisodeCount = chapter.episodes.filter(
    (episode) => episode.canPublish && !episode.published
  ).length;
  const latestImageGenerationError = chapter.episodes
    .filter((episode) => episode.latestImageGenerationAt)
    .sort(
      (left, right) =>
        (right.latestImageGenerationAt?.getTime() || 0) -
        (left.latestImageGenerationAt?.getTime() || 0)
    )[0]?.latestImageGenerationError;

  return (
    <ComicImageTaskQueueProvider maxConcurrent={5}>
      <div className="admin-page admin-page--comic-publish">
        <div className="stack-row">
          <Link href="/admin/comic/publish-center" className="button button--secondary">
            Back to publish center
          </Link>
          <Link href={`/admin/comic/chapters/${chapter.id}`} className="button button--ghost">
            Edit chapter
          </Link>
        </div>

        <div className="admin-page__header">
          <p className="eyebrow">
            Comic / Publish Center / Season {season.seasonNumber}
          </p>
          <h1>{chapter.title}</h1>
          <p>
            Work through each episode page by page. Generated images stay private until one image is
            approved for the cover plus pages 1 to 10.
          </p>
        </div>

        {query.status ? (
          <p className="notice">
            {STATUS_MESSAGES[query.status] || `Comic action completed: ${query.status}.`}
          </p>
        ) : null}

        <AdminActionResultDialog
          status={query.status}
          messages={buildImageResultMessages(latestImageGenerationError)}
        />

        <div className="cards-3">
          <section className="admin-card">
            <p className="eyebrow">Chapter</p>
            <h3>{season.title}</h3>
            <p>
              Chapter {chapter.chapterNumber} has {chapter.episodes.length} episode
              {chapter.episodes.length === 1 ? "" : "s"} in production.
            </p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Approved pages</p>
            <h3>
              {approvedPageCount} / {requiredPageCount}
            </h3>
            <p>English public pages need an approved cover plus 10 story images per episode.</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Chinese approved</p>
            <h3>
              {approvedChinesePageCount} / {requiredPageCount}
            </h3>
            <p>Chinese public pages and downloads use the same cover-plus-10-page rule.</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Ready</p>
            <h3>{readyEpisodeCount} episodes</h3>
            <p>Publish stays disabled until the English version has the cover and all 10 story pages.</p>
          </section>
        </div>

        {chapter.episodes.length > 0 ? (
          <div className="admin-comic-publish-stack">
            {chapter.episodes.map((episode) => (
              <ComicPublishEpisodeDetails
                key={episode.id}
                id={`episode-${episode.id}`}
                storageKey={`neatique:comic-publish-center:${chapter.id}:episode:${episode.id}:open`}
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
                <ComicPublishEpisodeProductionPanel
                  chapterId={chapter.id}
                  episodeId={episode.id}
                  episodeTitle={episode.title}
                  episodePublished={episode.published}
                />
              </ComicPublishEpisodeDetails>
            ))}
          </div>
        ) : (
          <section className="admin-form">
            <h2>No episodes in this chapter yet</h2>
            <p className="form-note">
              Add episodes to this chapter first. They will appear here as production boards with
              cover plus 10 page approval slots.
            </p>
            <Link href={`/admin/comic/chapters/${chapter.id}`} className="button button--primary">
              Add episodes
            </Link>
          </section>
        )}
      </div>
    </ComicImageTaskQueueProvider>
  );
}
