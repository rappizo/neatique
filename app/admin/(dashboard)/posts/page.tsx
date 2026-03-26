import {
  createPostAction,
  deletePostAction,
  updatePostAction
} from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { getAllPosts } from "@/lib/queries";

type AdminPostsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const [posts, params] = await Promise.all([getAllPosts(), searchParams]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Posts</p>
        <h1>Publish SEO beauty content from a dedicated editorial backend.</h1>
        <p>
          This is the content engine for your Beauty Tips section. We can use it to publish routine
          guides, ingredient explainers, and keyword-targeted blog posts on a regular cadence.
        </p>
      </div>

      {params.status ? <p className="notice">Post action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <h2>Create SEO post</h2>
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
              <input id="coverImageUrl" name="coverImageUrl" placeholder="/posts/example.svg" required />
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
            <h2>{post.title}</h2>
            <p>
              {post.category} · {post.published ? "Published" : "Draft"} · {formatDate(post.publishedAt)}
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
