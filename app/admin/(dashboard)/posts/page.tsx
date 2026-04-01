import {
  createPostAction,
  deletePostAction,
  generateAiPostNowAction,
  saveAiPostAutomationSettingsAction,
  updatePostAction
} from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { getAiPostAutomationOverview, getAllPosts } from "@/lib/queries";

type AdminPostsPageProps = {
  searchParams: Promise<{ status?: string }>;
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
          Set the cadence, rotate automatically through active products, generate a Beauty Tips post
          with an AI cover image, and choose whether the system creates drafts or publishes right
          away.
        </p>
      </div>

      {params.status ? <p className="notice">Post action completed: {params.status}.</p> : null}

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
        <h2>Generate the next AI post now</h2>
        <p>
          Use this to test the automation immediately. The system will choose the next product in
          the rotation, generate the article and cover image, then create a draft or publish it
          depending on the current automation settings.
        </p>
        <form action={generateAiPostNowAction}>
          <input type="hidden" name="redirectTo" value="/admin/posts" />
          <button type="submit" className="button button--primary">
            Generate next AI post
          </button>
        </form>
      </section>

      <section className="admin-form">
        <h2>Create manual SEO post</h2>
        <form action={createPostAction}>
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="slug">Slug</label>
              <input id="slug" name="slug" required />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <input id="category" name="category" required />
            </div>
            <div className="field">
              <label htmlFor="readTime">Read time</label>
              <input id="readTime" name="readTime" type="number" defaultValue="4" required />
            </div>
            <div className="field">
              <label htmlFor="coverImageUrl">Cover image URL</label>
              <input id="coverImageUrl" name="coverImageUrl" required />
            </div>
            <div className="field">
              <label htmlFor="coverImageAlt">Cover image alt</label>
              <input id="coverImageAlt" name="coverImageAlt" />
            </div>
            <div className="field">
              <label htmlFor="publishedAt">Published at</label>
              <input id="publishedAt" name="publishedAt" type="datetime-local" />
            </div>
            <div className="field">
              <label htmlFor="seoTitle">SEO title</label>
              <input id="seoTitle" name="seoTitle" required />
            </div>
            <div className="field">
              <label htmlFor="seoDescription">SEO description</label>
              <input id="seoDescription" name="seoDescription" required />
            </div>
            <label className="field field--checkbox">
              <input type="checkbox" name="published" />
              Publish immediately
            </label>
          </div>
          <div className="field">
            <label htmlFor="excerpt">Excerpt</label>
            <textarea id="excerpt" name="excerpt" required />
          </div>
          <div className="field">
            <label htmlFor="content">Post content</label>
            <textarea id="content" name="content" required />
          </div>
          <button type="submit" className="button button--primary">
            Create post
          </button>
        </form>
      </section>

      <div className="cards-2">
        {posts.map((post) => (
          <section key={post.id} className="admin-form">
            <div className="stack-row">
              <span className="pill">{post.category}</span>
              <span className="pill">{post.published ? "Published" : "Draft"}</span>
              {post.aiGenerated ? <span className="pill">AI generated</span> : null}
              {post.focusKeyword ? <span className="pill">{post.focusKeyword}</span> : null}
            </div>
            <h2>{post.title}</h2>
            <p>
              {post.sourceProductName
                ? `Linked to ${post.sourceProductName}. `
                : "Manual or editorial post. "}
              {formatDate(post.publishedAt)}
            </p>
            <form action={updatePostAction}>
              <input type="hidden" name="id" value={post.id} />
              <div className="admin-form__grid">
                <div className="field">
                  <label>Title</label>
                  <input name="title" defaultValue={post.title} />
                </div>
                <div className="field">
                  <label>Slug</label>
                  <input name="slug" defaultValue={post.slug} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <input name="category" defaultValue={post.category} />
                </div>
                <div className="field">
                  <label>Read time</label>
                  <input name="readTime" type="number" defaultValue={post.readTime} />
                </div>
                <div className="field">
                  <label>Cover image URL</label>
                  <input name="coverImageUrl" defaultValue={post.coverImageUrl} />
                </div>
                <div className="field">
                  <label>Cover image alt</label>
                  <input name="coverImageAlt" defaultValue={post.coverImageAlt || ""} />
                </div>
                <div className="field">
                  <label>Published at</label>
                  <input
                    name="publishedAt"
                    type="datetime-local"
                    defaultValue={
                      post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : ""
                    }
                  />
                </div>
                <div className="field">
                  <label>SEO title</label>
                  <input name="seoTitle" defaultValue={post.seoTitle} />
                </div>
                <div className="field">
                  <label>SEO description</label>
                  <input name="seoDescription" defaultValue={post.seoDescription} />
                </div>
                <label className="field field--checkbox">
                  <input type="checkbox" name="published" defaultChecked={post.published} />
                  Published
                </label>
              </div>
              <div className="field">
                <label>Excerpt</label>
                <textarea name="excerpt" defaultValue={post.excerpt} />
              </div>
              <div className="field">
                <label>Content</label>
                <textarea name="content" defaultValue={post.content} />
              </div>
              <button type="submit" className="button button--primary">
                Save changes
              </button>
            </form>
            <form action={deletePostAction}>
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" className="button button--ghost">
                Delete post
              </button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
