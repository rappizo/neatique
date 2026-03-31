import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMascotRewardAction } from "@/app/admin/actions";
import { MascotEditorForm } from "@/components/admin/mascot-editor-form";
import { getMascotRewardById } from "@/lib/queries";

type AdminMascotDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminMascotDetailPage({
  params,
  searchParams
}: AdminMascotDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const mascot = await getMascotRewardById(id);

  if (!mascot) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/rewards" className="button button--secondary">
          Back to points
        </Link>
      </div>

      {query.status ? <p className="notice">Mascot action completed: {query.status}.</p> : null}

      <MascotEditorForm action={updateMascotRewardAction} mode="edit" mascot={mascot} />
    </div>
  );
}
