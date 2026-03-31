import Link from "next/link";
import { createCouponAction, toggleCouponStatusAction } from "@/app/admin/actions";
import { CouponEditorForm } from "@/components/admin/coupon-editor-form";
import { formatDate } from "@/lib/format";
import { getCoupons } from "@/lib/queries";
import {
  formatCouponCombinationSummary,
  formatCouponExpirySummary,
  formatCouponScopeSummary,
  formatCouponValue
} from "@/lib/coupons";

type AdminCouponsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminCouponsPage({ searchParams }: AdminCouponsPageProps) {
  const [coupons, params] = await Promise.all([getCoupons(), searchParams]);

  return (
    <div className="admin-page">
      {params.status ? <p className="notice">Coupon action completed: {params.status}.</p> : null}

      <CouponEditorForm action={createCouponAction} mode="create" />

      <section className="admin-page__header">
        <p className="eyebrow">Coupon library</p>
        <h2>Manage active and inactive coupon codes.</h2>
        <p>
          Each card shows the checkout value, scope, usage mode, and current redemption count
          before you open the full editor.
        </p>
      </section>

      <div className="admin-product-grid">
        {coupons.map((coupon) => (
          <article key={coupon.id} className="admin-product-card">
            <div className="admin-product-card__body">
              <div className="product-card__meta">
                <span>{coupon.expired ? "Expired" : coupon.active ? "Active" : "Inactive"}</span>
                <span>{formatCouponValue(coupon)}</span>
                <span>{coupon.usageMode === "SINGLE_USE" ? "Single use" : "Unlimited"}</span>
                <span>{coupon.combinable ? "Combinable" : "Standalone"}</span>
              </div>
              <h3>{coupon.code}</h3>
              <p>{coupon.content}</p>
              <ul className="admin-list">
                <li>Scope: {formatCouponScopeSummary(coupon)}</li>
                <li>Combination: {formatCouponCombinationSummary(coupon)}</li>
                <li>Validity: {formatCouponExpirySummary(coupon)}</li>
                <li>Used {coupon.usageCount} time(s)</li>
                <li>Updated {formatDate(coupon.updatedAt)}</li>
              </ul>

              <div className="stack-row">
                <Link href={`/admin/coupons/${coupon.id}`} className="button button--primary">
                  Edit coupon
                </Link>
                <form action={toggleCouponStatusAction}>
                  <input type="hidden" name="id" value={coupon.id} />
                  <input
                    type="hidden"
                    name="nextActive"
                    value={coupon.active ? "false" : "true"}
                  />
                  <button type="submit" className="button button--secondary">
                    {coupon.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
