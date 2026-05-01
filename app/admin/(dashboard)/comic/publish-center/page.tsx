import Link from "next/link";
import { getComicPublishCenter } from "@/lib/comic-queries";
import { formatDate } from "@/lib/format";
import type { ComicPublishCenterChapterRecord } from "@/lib/types";

type AdminComicPublishCenterPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "page-approved": "Comic page approved.",
  "page-unapproved": "Comic page approval was removed.",
  "page-chinese-approved": "Chinese comic page approved.",
  "page-chinese-unapproved": "Chinese comic page approval was removed.",
  "page-uploaded": "Comic page image uploaded as a draft.",
  "page-uploaded-approved": "Comic page image uploaded and approved.",
  "episode-published": "Episode published to the public comic library.",
  "episode-unpublished": "Episode unpublished. Approved pages are still saved.",
  "unpublish-before-approval-change": "Unpublish this episode before removing or deleting an approved comic page.",
  "missing-approved-pages": "Approve pages 1-10 before publishing this episode.",
  "missing-upload": "Choose an image file before uploading.",
  "upload-too-large": "Comic page uploads must stay under 20MB.",
  "upload-type": "Upload PNG, JPG, WEBP, or AVIF images only."
};

function getChapterStats(chapter: ComicPublishCenterChapterRecord) {
  const episodeCount = chapter.episodes.length;
  const approvedPageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.approvedPageCount,
    0
  );
  const requiredPageCount = chapter.episodes.reduce(
    (sum, episode) => sum + episode.requiredPageCount,
    0
  );
  const draftPageCount = chapter.episodes.reduce((sum, episode) => sum + episode.draftPageCount, 0);
  const readyEpisodeCount = chapter.episodes.filter(
    (episode) => episode.canPublish && !episode.published
  ).length;
  const publishedEpisodeCount = chapter.episodes.filter((episode) => episode.published).length;

  return {
    episodeCount,
    approvedPageCount,
    requiredPageCount,
    draftPageCount,
    readyEpisodeCount,
    publishedEpisodeCount
  };
}

function getChapterStatus(chapter: ComicPublishCenterChapterRecord) {
  const stats = getChapterStats(chapter);

  if (stats.episodeCount === 0) {
    return {
      label: "No episodes",
      className: "admin-table__status-badge admin-table__status-badge--warning"
    };
  }

  if (stats.publishedEpisodeCount === stats.episodeCount) {
    return {
      label: "Published",
      className: "admin-table__status-badge admin-table__status-badge--success"
    };
  }

  if (stats.readyEpisodeCount > 0) {
    return {
      label: "Ready to publish",
      className: "admin-table__status-badge admin-table__status-badge--success"
    };
  }

  return {
    label: "In production",
    className: "admin-table__status-badge admin-table__status-badge--warning"
  };
}

export default async function AdminComicPublishCenterPage({
  searchParams
}: AdminComicPublishCenterPageProps) {
  const [publishCenter, params] = await Promise.all([getComicPublishCenter(), searchParams]);
  const chapters = publishCenter.seasons.flatMap((season) =>
    season.chapters.map((chapter) => ({
      ...chapter,
      seasonNumber: season.seasonNumber,
      seasonPublished: season.published
    }))
  );

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/prompt-studio" className="button button--ghost">
          Prompt studio
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Publish Center</p>
        <h1>Approve comic pages by chapter, then publish finished episodes.</h1>
        <p>
          Each chapter opens into an episode production board. Review generated page images, upload
          externally produced page art, approve one final image for pages 1-10, and publish only
          when the full episode is ready.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Episode pipeline</p>
          <h3>{publishCenter.episodeCount} episodes</h3>
          <p>{publishCenter.readyEpisodeCount} episodes have all 10 required pages approved.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Published library</p>
          <h3>{publishCenter.publishedEpisodeCount} live episodes</h3>
          <p>Published episodes are visible on the public comic pages once their parents are live.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Draft page images</p>
          <h3>{publishCenter.draftAssetCount} candidates</h3>
          <p>Generated and uploaded images stay private here until you approve them.</p>
        </section>
      </div>

      <section className="admin-form admin-table">
        <div className="admin-review-pagination">
          <div>
            <h2>Chapter production list</h2>
            <p className="form-note">
              Open a chapter to work episode by episode. The approval count tracks pages 1-10 for
              each episode.
            </p>
          </div>
          <Link href="/admin/comic/seasons" className="button button--secondary">
            Manage story structure
          </Link>
        </div>

        {chapters.length > 0 ? (
          <div className="admin-table--scroll">
            <table>
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Season</th>
                  <th>Episodes</th>
                  <th>Approved pages</th>
                  <th>Draft images</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter) => {
                  const stats = getChapterStats(chapter);
                  const status = getChapterStatus(chapter);

                  return (
                    <tr key={chapter.id}>
                      <td>
                        <div className="admin-table__cell-stack">
                          <strong>{chapter.title}</strong>
                          <span className="form-note">
                            Chapter {chapter.chapterNumber} / {chapter.slug}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-table__cell-stack">
                          <span>{chapter.seasonTitle}</span>
                          <span className="form-note">
                            Season {chapter.seasonNumber} / {chapter.seasonPublished ? "Live" : "Draft"}
                          </span>
                        </div>
                      </td>
                      <td>{stats.episodeCount}</td>
                      <td>
                        {stats.approvedPageCount} / {stats.requiredPageCount || 0}
                      </td>
                      <td>{stats.draftPageCount}</td>
                      <td>
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td>{formatDate(chapter.updatedAt)}</td>
                      <td>
                        <div className="admin-table__actions">
                          <Link
                            href={`/admin/comic/publish-center/chapters/${chapter.id}`}
                            className="button button--primary"
                          >
                            Open production
                          </Link>
                          <Link
                            href={`/admin/comic/chapters/${chapter.id}`}
                            className="button button--secondary"
                          >
                            Edit chapter
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">
            No chapters exist yet. Create seasons and chapters first, then return here to manage
            comic publishing.
          </p>
        )}
      </section>
    </div>
  );
}
