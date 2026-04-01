import Link from "next/link";
import { createPostAction } from "@/app/admin/actions";
import { PostEditorForm } from "@/components/admin/post-editor-form";

export default function AdminNewPostPage() {
  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/posts" className="button button--secondary">
          Back to posts
        </Link>
      </div>

      <PostEditorForm action={createPostAction} mode="create" />
    </div>
  );
}
