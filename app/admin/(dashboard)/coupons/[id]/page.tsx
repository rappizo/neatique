import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleCouponStatusAction, updateCouponAction } from "@/app/admin/actions";
import { CouponEditorForm } from "@/components/admin/coupon-editor-form";
import { getCouponById } from "@/lib/queries";

type AdminCouponDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminCouponDetailPage({
  params,
  searchParams
}: AdminCouponDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const coupon = await getCouponById(id);

  if (!coupon) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/coupons" className="button button--secondary">
          Back to coupons
        </Link>
        <form action={toggleCouponStatusAction}>
          <input type="hidden" name="id" value={coupon.id} />
          <input type="hidden" name="nextActive" value={coupon.active ? "false" : "true"} />
          <button type="submit" className="button button--ghost" disabled={!coupon.active && coupon.expired}>
            {coupon.active ? "Mark inactive" : coupon.expired ? "Expired coupon" : "Activate coupon"}
          </button>
        </form>
      </div>

      {query.status ? <p className="notice">Coupon action completed: {query.status}.</p> : null}

      <CouponEditorForm action={updateCouponAction} mode="edit" coupon={coupon} />
    </div>
  );
}
