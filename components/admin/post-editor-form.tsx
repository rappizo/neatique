import Image from "next/image";
import Link from "next/link";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { formatDate, formatTime } from "@/lib/format";
import type { BeautyPostRecord } from "@/lib/types";

type PostEditorFormProps = {
  action: (formData: FormData) => Promise<void>;
  regenerateImageAction?: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  post?: BeautyPostRecord | null;
};

function toDateTimeLocalValue(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

export function PostEditorForm({
  action,
  regenerateImageAction,
  mode,
  post
}: PostEditorFormProps) {
  const isEdit = mode === "edit" && post;
  const redirectTo = isEdit ? `/admin/posts/${post.id}` : "/admin/posts";

  return (
    <section className="admin-form admin-post-editor">
      <div className="admin-product-editor__header">
        <div className="admin-page__header">
          <p className="eyebrow">{mode === "create" ? "New Post" : "Edit Post"}</p>
          <h1>
            {mode === "create"
              ? "Create a manual Beauty Tips post."
              : `Update ${post?.title}.`}
          </h1>
          <p>
            Edit the article fields, update the image URL when needed, or regenerate the AI cover
            image for a fresher branded visual.
          </p>
        </div>

        {post ? (
          <article className="admin-product-card admin-product-card--preview">
            <div className="admin-product-card__media admin-post-card__media">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                width={720}
                height={480}
                unoptimized
              />
            </div>
            <div className="admin-product-card__body">
              <div className="product-card__meta">
                <span>{post.category}</span>
                <span>{post.published ? "Published" : "Draft"}</span>
                <span>{post.aiGenerated ? "AI generated" : "Manual"}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <div className="stack-row">
                {post.focusKeyword ? <span className="pill">{post.focusKeyword}</span> : null}
                {post.sourceProductName ? <span className="pill">{post.sourceProductName}</span> : null}
                <span className="pill">
                  {formatDate(post.createdAt)} {formatTime(post.createdAt)}
                </span>
              </div>
              <div className="stack-row">
                <Link href="/admin/posts" className="button button--secondary">
                  Back to list
                </Link>
                {post.published ? (
                  <Link href={`/beauty-tips/${post.slug}`} className="button button--ghost">
                    View live post
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}
      </div>

      <form action={action}>
        {post ? <input type="hidden" name="id" value={post.id} /> : null}
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={post?.title || ""} required />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input id="slug" name="slug" defaultValue={post?.slug || ""} required />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <input id="category" name="category" defaultValue={post?.category || ""} required />
          </div>
          <div className="field">
            <label htmlFor="readTime">Read time</label>
            <input
              id="readTime"
              name="readTime"
              type="number"
              min="1"
              defaultValue={post?.readTime || 4}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="coverImageUrl">Cover image URL</label>
            <input
              id="coverImageUrl"
              name="coverImageUrl"
              defaultValue={post?.coverImageUrl || ""}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="coverImageAlt">Cover image alt</label>
            <input
              id="coverImageAlt"
              name="coverImageAlt"
              defaultValue={post?.coverImageAlt || ""}
            />
          </div>
          <div className="field">
            <label htmlFor="publishedAt">Published at</label>
            <input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(post?.publishedAt)}
            />
          </div>
          <div className="field">
            <label htmlFor="seoTitle">SEO title</label>
            <input id="seoTitle" name="seoTitle" defaultValue={post?.seoTitle || ""} required />
          </div>
          <div className="field">
            <label htmlFor="seoDescription">SEO description</label>
            <input
              id="seoDescription"
              name="seoDescription"
              defaultValue={post?.seoDescription || ""}
              required
            />
          </div>
          <label className="field field--checkbox">
            <input type="checkbox" name="published" defaultChecked={post?.published ?? false} />
            Published
          </label>
        </div>

        <div className="field">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt || ""} required />
        </div>

        <div className="field">
          <label htmlFor="content">Post content</label>
          <textarea id="content" name="content" defaultValue={post?.content || ""} required />
        </div>

        <div className="stack-row">
          <button type="submit" className="button button--primary">
            {isEdit ? "Save post" : "Create post"}
          </button>
        </div>
      </form>

      {isEdit ? (
        <div className="admin-post-editor__secondary">
          <section className="admin-card">
            <p className="eyebrow">Image controls</p>
            <h3>Refresh the cover image</h3>
            <p>
              Replace the AI image while keeping the same post. Regeneration will prioritize a
              Neatique-branded scene or a model-use visual with no generic product shown.
            </p>
            {post.imagePrompt ? (
              <div className="admin-post-editor__prompt">
                <strong>Current image prompt</strong>
                <p>{post.imagePrompt}</p>
              </div>
            ) : null}
            {regenerateImageAction ? (
              <form action={regenerateImageAction}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <input type="hidden" name="imagePrompt" value={post.imagePrompt || ""} />
                <PendingSubmitButton
                  idleLabel="Regenerate cover image"
                  pendingLabel="Regenerating image..."
                  className="button button--secondary"
                  modalTitle="Generating a fresh cover image"
                  modalDescription="This can take a little while while the new branded visual is generated and saved."
                />
              </form>
            ) : null}
          </section>

          <section className="admin-card">
            <p className="eyebrow">Post details</p>
            <h3>Publishing context</h3>
            <ul className="admin-list">
              <li>Created: {formatDate(post.createdAt)} {formatTime(post.createdAt)}</li>
              <li>Updated: {formatDate(post.updatedAt)} {formatTime(post.updatedAt)}</li>
              <li>Generated: {post.generatedAt ? `${formatDate(post.generatedAt)} ${formatTime(post.generatedAt)}` : "Not AI generated"}</li>
              <li>Source product: {post.sourceProductName || "Not linked"}</li>
              <li>Focus keyword: {post.focusKeyword || "Not set"}</li>
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}
