import Link from "next/link";
import { notFound } from "next/navigation";
import { PostArticleView } from "@/components/site/post-article-view";
import { requireAdminSession } from "@/lib/admin-auth";
import { getPostById } from "@/lib/queries";

type AdminPostPreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPostPreviewPage({ params }: AdminPostPreviewPageProps) {
  await requireAdminSession();

  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href={`/admin/posts/${post.id}`} className="button button--secondary">
          Back to post editor
        </Link>
      </div>
      <PostArticleView
        post={post}
        previewLabel={post.published ? post.category : "Draft preview"}
        previewNote={
          post.published
            ? "This article is currently live on the storefront."
            : "This draft preview is visible only in admin until you publish the post."
        }
      />
    </div>
  );
}
