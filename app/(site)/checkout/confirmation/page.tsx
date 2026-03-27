import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutConfirmationForm } from "@/components/checkout/checkout-confirmation-form";
import { getCartDetails } from "@/lib/cart";
import { getCheckoutDraft } from "@/lib/checkout-draft";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCouponValue } from "@/lib/coupons";
import { formatCurrency } from "@/lib/format";

type CheckoutConfirmationPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "Review your contact details, address information, and final order summary before payment."
};

export default async function CheckoutConfirmationPage({
  searchParams
}: CheckoutConfirmationPageProps) {
  const [{ lines, subtotalCents, discountedSubtotalCents, discountCents, appliedCoupons }, draft, currentCustomer, params] =
    await Promise.all([getCartDetails(), getCheckoutDraft(), getCurrentCustomer(), searchParams]);

  if (lines.length === 0) {
    redirect("/cart?error=empty-cart");
  }

  const email = draft?.email || currentCustomer?.email || "";
  const firstName = draft?.firstName || currentCustomer?.firstName || "";
  const lastName = draft?.lastName || currentCustomer?.lastName || "";

  if (!email || !firstName || !lastName) {
    redirect("/cart?error=contact");
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Order Confirmation</p>
          <h1>Review your order details before you enter secure payment.</h1>
          <p>
            Confirm your contact information, add professional shipping and billing details, and
            then continue to the final Stripe payment step.
          </p>
          <div className="page-hero__stats">
            <span className="pill">Secure payment</span>
            <span className="pill">Contiguous U.S. only</span>
            <span className="pill">Order details saved before checkout</span>
          </div>
        </div>

        {params.error === "address-missing" ? (
          <p className="notice">Please complete all required shipping or billing address fields.</p>
        ) : null}
        {params.error === "address-state" ? (
          <p className="notice">Please select a valid contiguous U.S. state for your address.</p>
        ) : null}
        {params.error === "address-postal" ? (
          <p className="notice">Please enter a valid U.S. ZIP code.</p>
        ) : null}
        {params.error === "stripe-config" ? (
          <p className="notice">Secure payment is unavailable because Stripe is not configured correctly.</p>
        ) : null}
        {params.error === "stripe-checkout" ? (
          <p className="notice">We could not open Stripe checkout. Please try again in a moment.</p>
        ) : null}
        {params.error === "coupon-over-discount" ? (
          <p className="notice">
            One of the coupon combinations makes the payable amount invalid for Stripe. Please go
            back to cart and use a lower discount coupon.
          </p>
        ) : null}
        {params.status === "canceled" ? (
          <p className="notice">Your payment was canceled. Your order details are still here, so you can try again anytime.</p>
        ) : null}

        <div className="checkout-confirmation-layout">
          <div className="checkout-confirmation-main">
            <section className="admin-form">
              <div className="checkout-confirmation-form__header">
                <div>
                  <p className="eyebrow">Contact</p>
                  <h2>Customer information</h2>
                </div>
                <Link href="/cart" className="link-inline">
                  Edit in cart
                </Link>
              </div>
              <ul className="admin-list">
                <li>Email: {email}</li>
                <li>Name: {firstName} {lastName}</li>
              </ul>
            </section>

            <CheckoutConfirmationForm
              contact={{ email, firstName, lastName }}
              draft={draft}
            />
          </div>

          <aside className="admin-form checkout-confirmation-summary">
            <h2>Order summary</h2>
            <div className="checkout-confirmation-summary__lines">
              {lines.map((line) => (
                <article key={line.product.id} className="checkout-confirmation-summary__line">
                  <div>
                    <strong>{line.product.name}</strong>
                    <p>{line.quantity} x {formatCurrency(line.product.priceCents)}</p>
                  </div>
                  <div className="cart-line__total">
                    {line.discountCents > 0 ? (
                      <>
                        <span className="product-price-stack__original">
                          {formatCurrency(line.originalLineTotalCents)}
                        </span>
                        <strong>{formatCurrency(line.lineTotalCents)}</strong>
                      </>
                    ) : (
                      <strong>{formatCurrency(line.lineTotalCents)}</strong>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {appliedCoupons.length > 0 ? (
              <div className="checkout-confirmation-summary__coupons">
                <p className="eyebrow">Applied coupon</p>
                {appliedCoupons.map((coupon) => (
                  <div key={coupon.id} className="pill">
                    <strong>{coupon.code}</strong>
                    <span>{formatCouponValue(coupon)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="checkout-confirmation-summary__totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotalCents)}</strong>
              </div>
              {discountCents > 0 ? (
                <div>
                  <span>Coupon savings</span>
                  <strong>-{formatCurrency(discountCents)}</strong>
                </div>
              ) : null}
              <div>
                <span>Estimated total before tax</span>
                <strong>{formatCurrency(discountedSubtotalCents)}</strong>
              </div>
            </div>

            <p className="form-note">
              Shipping and sales tax will be finalized during secure payment.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
