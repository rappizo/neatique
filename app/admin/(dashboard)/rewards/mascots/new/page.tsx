import Link from "next/link";
import { createMascotRewardAction } from "@/app/admin/actions";
import { MascotEditorForm } from "@/components/admin/mascot-editor-form";

type AdminCreateMascotPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminCreateMascotPage({
  searchParams
}: AdminCreateMascotPageProps) {
  const params = await searchParams;

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/rewards" className="button button--secondary">
          Back to points
        </Link>
      </div>

      {params.status ? <p className="notice">Mascot action completed: {params.status}.</p> : null}

      <MascotEditorForm action={createMascotRewardAction} mode="create" />
    </div>
  );
}
