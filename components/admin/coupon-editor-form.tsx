import type { CouponRecord } from "@/lib/types";
import { formatCurrency, formatCurrencyInput } from "@/lib/format";
import {
  formatCouponCombinationSummary,
  formatCouponScopeSummary,
  formatCouponValue
} from "@/lib/coupons";

type CouponEditorFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  coupon?: CouponRecord | null;
};

export function CouponEditorForm({ action, mode, coupon }: CouponEditorFormProps) {
  const scopeValue = coupon?.appliesToAll ? "ALL" : coupon?.productCodes.join("\n") ?? "";

  return (
    <section className="admin-form">
      <div className="admin-page__header">
        <p className="eyebrow">{mode === "create" ? "New coupon" : "Edit coupon"}</p>
        <h1>{mode === "create" ? "Create a coupon for checkout." : `Update ${coupon?.code}.`}</h1>
        <p>
          Choose percentage or fixed savings, target one or more Product IDs, or enter ALL for an
          order-wide coupon.
        </p>
      </div>

      {coupon ? (
        <article className="admin-card">
          <div className="product-card__meta">
            <span>{coupon.active ? "Active" : "Inactive"}</span>
            <span>{formatCouponValue(coupon)}</span>
            <span>{coupon.usageMode === "SINGLE_USE" ? "Single use" : "Unlimited"}</span>
            <span>{coupon.combinable ? "Combinable" : "Standalone"}</span>
          </div>
          <h3>{coupon.code}</h3>
          <p>{coupon.content}</p>
          <ul className="admin-list">
            <li>Scope: {formatCouponScopeSummary(coupon)}</li>
            <li>Combination: {formatCouponCombinationSummary(coupon)}</li>
            <li>Used {coupon.usageCount} time(s)</li>
          </ul>
        </article>
      ) : null}

      <form action={action}>
        {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="code">Coupon code</label>
            <input
              id="code"
              name="code"
              defaultValue={coupon?.code ?? ""}
              placeholder="SPRING10"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="discountType">Discount type</label>
            <select
              id="discountType"
              name="discountType"
              defaultValue={coupon?.discountType ?? "PERCENT"}
            >
              <option value="PERCENT">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="percentOff">Percent off</label>
            <input
              id="percentOff"
              name="percentOff"
              type="number"
              min="0"
              max="100"
              defaultValue={coupon?.percentOff ?? ""}
              placeholder="10"
            />
          </div>
          <div className="field">
            <label htmlFor="amountOffCents">Fixed amount off</label>
            <input
              id="amountOffCents"
              name="amountOffCents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={formatCurrencyInput(coupon?.amountOffCents)}
              placeholder="5.00"
            />
          </div>
          <div className="field">
            <label htmlFor="usageMode">Usage</label>
            <select
              id="usageMode"
              name="usageMode"
              defaultValue={coupon?.usageMode ?? "UNLIMITED"}
            >
              <option value="UNLIMITED">Unlimited use</option>
              <option value="SINGLE_USE">Single use</option>
            </select>
          </div>
          <label className="field field--checkbox">
            <input type="checkbox" name="combinable" defaultChecked={coupon?.combinable ?? false} />
            Can combine with other coupons
          </label>
          <label className="field field--checkbox">
            <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} />
            Coupon is active
          </label>
        </div>

        <div className="field">
          <label htmlFor="content">Coupon content</label>
          <textarea
            id="content"
            name="content"
            defaultValue={coupon?.content ?? ""}
            placeholder="Order-wide launch offer for every first purchase."
            required
          />
        </div>

        <div className="field">
          <label htmlFor="scope">Eligible Product IDs</label>
          <textarea
            id="scope"
            name="scope"
            defaultValue={scopeValue}
            placeholder={"ALL\n0001\n0003"}
            required
          />
          <p className="form-note">
            Enter ALL for an order-wide coupon, or add one Product ID per line. Product IDs are
            the 4-digit values shown in product pages and admin product cards.
          </p>
        </div>

        {coupon ? (
          <p className="form-note">
            Current savings display: {formatCouponValue(coupon)}. Fixed amount coupons will be
            capped at the eligible subtotal during checkout.
          </p>
        ) : (
          <p className="form-note">
            Percentage coupons use the percent field. Fixed coupons use the dollar field, for
            example {formatCurrency(500)} for five dollars off.
          </p>
        )}

        <p className="form-note">
          New coupons default to standalone use. If this switch stays off, the checkout will reject
          any attempt to use this coupon together with a second code.
        </p>

        <button type="submit" className="button button--primary">
          {mode === "create" ? "Create coupon" : "Save coupon"}
        </button>
      </form>
    </section>
  );
}
