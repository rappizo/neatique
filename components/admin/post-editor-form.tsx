import Image from "next/image";
import Link from "next/link";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { formatDate, formatTime } from "@/lib/format";
import type { BeautyPostRecord } from "@/lib/types";

type PostEditorFormProps = {
  action: (formData: FormData) => Promise<void>;
  regenerateImageAction?: (formData: FormData) => Promise<void>;
  approveImagePreviewAction?: (formData: FormData) => Promise<void>;
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
  approveImagePreviewAction,
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
            Edit the article fields, keep the current alt description in sync, and manage a safer
            preview-to-approve image workflow for fresher branded visuals based on the linked
            product&apos;s main image whenever a source product is available.
          </p>
        </div>

        {post ? (
          <article className="admin-product-card admin-product-card--preview">
            <div className="admin-post-card__image-grid">
              <div className="admin-post-card__image-panel">
                <div className="admin-post-card__image-meta">
                  <span className="pill">Current live image</span>
                </div>
                <div className="admin-product-card__media admin-post-card__media">
                  <Image
                    src={post.coverImageUrl}
                    alt={post.coverImageAlt || post.title}
                    width={720}
                    height={480}
                    unoptimized
                  />
                </div>
              </div>

              <div className="admin-post-card__image-panel">
                <div className="admin-post-card__image-meta">
                  <span className="pill">
                    {post.previewImageUrl ? "New preview ready" : "No preview yet"}
                  </span>
                  {post.previewImageGeneratedAt ? (
                    <span className="pill">
                      {formatDate(post.previewImageGeneratedAt)} {formatTime(post.previewImageGeneratedAt)}
                    </span>
                  ) : null}
                </div>
                <div className="admin-product-card__media admin-post-card__media">
                  {post.previewImageUrl ? (
                    <Image
                      src={post.previewImageUrl}
                      alt={post.coverImageAlt || post.title}
                      width={720}
                      height={480}
                      unoptimized
                    />
                  ) : (
                    <div className="admin-post-card__placeholder">
                      <strong>Preview will appear here</strong>
                      <p>Generate a new post image to review it before making it live.</p>
                    </div>
                  )}
                </div>
              </div>
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
                <Link
                  href={post.published ? `/beauty-tips/${post.slug}` : `/admin/posts/${post.id}/preview`}
                  className="button button--ghost"
                >
                  {post.published ? "View live post" : "Preview draft"}
                </Link>
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
            <h3>Generate and approve a new post image</h3>
            <p>
              Generate a preview first, review it on the right, then approve it to replace the
              live post image. When the post is linked to a product, AI will use that product&apos;s
              main image as the reference before building a richer scene image. The current alt
              description stays in place unless you edit it in the main form above.
            </p>
            {post.previewImagePrompt || post.imagePrompt ? (
              <div className="admin-post-editor__prompt">
                <strong>{post.previewImagePrompt ? "Preview image prompt" : "Current image prompt"}</strong>
                <p>{post.previewImagePrompt || post.imagePrompt}</p>
              </div>
            ) : null}
            {regenerateImageAction ? (
              <form action={regenerateImageAction}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <input type="hidden" name="imagePrompt" value={post.previewImagePrompt || post.imagePrompt || ""} />
                <PendingSubmitButton
                  idleLabel={post.previewImageUrl ? "Regenerate preview image" : "Generate preview image"}
                  pendingLabel={post.previewImageUrl ? "Regenerating preview..." : "Generating preview..."}
                  className="button button--secondary"
                  modalTitle="Generating a new post image preview"
                  modalDescription="A fresh preview image is being created now. Once it appears, you can approve it to replace the live post image."
                />
              </form>
            ) : null}
            {approveImagePreviewAction && post.previewImageUrl ? (
              <form action={approveImagePreviewAction}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button type="submit" className="button button--primary">
                  Approve preview and replace live image
                </button>
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
