import Link from "next/link";
import {
  generateAiPostNowAction,
  saveAiPostAutomationSettingsAction
} from "@/app/admin/actions";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { formatDate, formatTime } from "@/lib/format";
import { getAiPostAutomationOverview, getAllPosts } from "@/lib/queries";

type AdminPostsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "Post created.",
  updated: "Post updated.",
  deleted: "Post deleted.",
  "image-regenerated": "A fresh cover image was generated for this post.",
  "missing-post": "That post could not be found.",
  "automation-settings-saved": "AI post automation settings were saved.",
  "ai-post-draft-created": "AI created a new draft post.",
  "ai-post-published": "AI created and published a new post.",
  "ai-failed-failed": "AI post generation failed. Review the latest status card for the exact OpenAI or database error.",
  "ai-skipped-not-due": "The next scheduled run is not due yet.",
  "ai-skipped-draft-pending": "An unpublished AI draft already exists, so the automation skipped creating another one."
};

export default async function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const [posts, automation, params] = await Promise.all([
    getAllPosts(),
    getAiPostAutomationOverview(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Posts</p>
        <h1>Run AI-assisted SEO publishing from the same editorial backend you already use.</h1>
        <p>
          Review automation status, trigger the next AI draft, and manage every Beauty Tips article
          from a clean post library sorted by newest first.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Post action completed: ${params.status}.`}
        </p>
      ) : null}

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Automation status</p>
          <h3>{automation.enabled ? "Automation is active" : "Automation is paused"}</h3>
          <p>
            {automation.autoPublish
              ? `A new AI post will publish every ${automation.cadenceDays} day(s) when the cycle is due.`
              : `A new AI draft will be created every ${automation.cadenceDays} day(s) when the cycle is due.`}
          </p>
          <div className="stack-row">
            <span className="pill">{automation.model ? `Text ${automation.model}` : "No text model"}</span>
            <span className="pill">{automation.imageModel ? `Image ${automation.imageModel}` : "No image model"}</span>
            <span className="pill">{automation.includeExternalLinks ? "External links on" : "External links off"}</span>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Rotation queue</p>
          <h3>{automation.nextProductName || "No product queued yet"}</h3>
          <p>
            {automation.nextProductCode
              ? `Next in line: Product ${automation.nextProductCode}.`
              : "The queue will start with the first active product once automation runs."}
          </p>
          <div className="stack-row">
            <span className="pill">{automation.aiPostCount} AI posts total</span>
            <span className="pill">{automation.publishedAiPostCount} published</span>
            <span className="pill">{automation.draftAiPostCount} drafts</span>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Last run</p>
          <h3>{automation.lastRunAt ? formatDate(automation.lastRunAt) : "Not run yet"}</h3>
          <p>
            {automation.lastPostTitle
              ? `Latest AI post: ${automation.lastPostTitle}.`
              : "No AI-generated post has been created yet."}
          </p>
          <div className="stack-row">
            <span className="pill">{automation.lastStatus || "No status yet"}</span>
          </div>
        </section>
      </div>

      <section className="admin-form">
        <h2>AI SEO post automation</h2>
        <form action={saveAiPostAutomationSettingsAction}>
          <div className="admin-form__grid">
            <label className="field field--checkbox">
              <input type="checkbox" name="ai_post_enabled" defaultChecked={automation.enabled} />
              Enable scheduled AI post generation
            </label>
            <div className="field">
              <label htmlFor="ai_post_cadence_days">Cadence in days</label>
              <input
                id="ai_post_cadence_days"
                name="ai_post_cadence_days"
                type="number"
                min="1"
                defaultValue={automation.cadenceDays}
                required
              />
            </div>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="ai_post_auto_publish"
                defaultChecked={automation.autoPublish}
              />
              Publish automatically when a run succeeds
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="ai_post_include_external_links"
                defaultChecked={automation.includeExternalLinks}
              />
              Allow approved authority links in AI posts
            </label>
          </div>
          <button type="submit" className="button button--primary">
            Save automation settings
          </button>
        </form>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Generate the next AI post now</h2>
            <p className="form-note">
              The system will pick the next product in the rotation, generate the article and cover
              image, then create a draft or publish it based on your automation settings.
            </p>
          </div>
          <div className="stack-row">
            <Link href="/admin/posts/new" className="button button--secondary">
              Create manual post
            </Link>
          </div>
        </div>
        <form action={generateAiPostNowAction}>
          <input type="hidden" name="redirectTo" value="/admin/posts" />
          <PendingSubmitButton
            idleLabel="Generate next AI post"
            pendingLabel="Generating AI post..."
            modalTitle="Generating the next AI SEO post"
            modalDescription="The article and cover image are being created now. This can take a little while, so the page will update when everything is ready."
          />
        </form>
      </section>

      <section className="admin-form admin-table">
        <div className="admin-review-pagination">
          <div>
            <h2>Post library</h2>
            <p className="form-note">
              Newest entries appear first, including drafts. Open any item to edit the full post,
              update the image URL, or regenerate the cover image.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">{posts.length} total posts</span>
            <span className="pill">{posts.filter((post) => !post.published).length} drafts</span>
          </div>
        </div>

        <div className="admin-table--scroll">
          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Status</th>
                <th>Type</th>
                <th>Source</th>
                <th>Keyword</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className="admin-table__cell-stack">
                      <strong>{post.title}</strong>
                      <span className="form-note">{post.slug}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`admin-table__status-badge ${
                        post.published
                          ? "admin-table__status-badge--success"
                          : "admin-table__status-badge--warning"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>{post.aiGenerated ? "AI generated" : "Manual"}</td>
                  <td>{post.sourceProductName || "Editorial"}</td>
                  <td>{post.focusKeyword || "Not set"}</td>
                  <td>
                    {formatDate(post.createdAt)} {formatTime(post.createdAt)}
                  </td>
                  <td>
                    {formatDate(post.updatedAt)} {formatTime(post.updatedAt)}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link href={`/admin/posts/${post.id}`} className="button button--primary">
                        Edit
                      </Link>
                      <Link href={`/beauty-tips/${post.slug}`} className="button button--ghost">
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
