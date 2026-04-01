import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deletePostAction,
  regeneratePostImageAction,
  updatePostAction
} from "@/app/admin/actions";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { getPostById } from "@/lib/queries";

type AdminPostDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  updated: "Post saved.",
  "image-regenerated": "Cover image regenerated.",
  deleted: "Post deleted.",
  "missing-post": "That post could not be found."
};

export default async function AdminPostDetailPage({
  params,
  searchParams
}: AdminPostDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/posts" className="button button--secondary">
          Back to posts
        </Link>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `Post action completed: ${query.status}.`}
        </p>
      ) : null}

      <PostEditorForm
        action={updatePostAction}
        regenerateImageAction={regeneratePostImageAction}
        mode="edit"
        post={post}
      />

      <section className="admin-form">
        <h2>Delete post</h2>
        <p>Delete the post only if you are sure it should be removed from both the admin and the site.</p>
        <form action={deletePostAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="redirectTo" value="/admin/posts" />
          <button type="submit" className="button button--ghost">
            Delete {post.title}
          </button>
        </form>
      </section>
    </div>
  );
}
