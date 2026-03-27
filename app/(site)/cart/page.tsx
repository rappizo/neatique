import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  clearCartAction,
  removeCartItemAction,
  updateCartCouponsAction,
  updateCartItemAction
} from "@/app/(site)/cart/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { getCartDetails } from "@/lib/cart";
import { formatCouponValue } from "@/lib/coupons";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";

type CartPageProps = {
  searchParams: Promise<{ status?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your Neatique selections and continue to checkout."
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const [
    { lines, subtotalCents, discountedSubtotalCents, discountCents, itemCount, couponCodes, appliedCoupons },
    currentCustomer,
    params
  ] = await Promise.all([
    getCartDetails(),
    getCurrentCustomer(),
    searchParams
  ]);

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Cart</p>
          <h1>Your skincare picks, ready for checkout.</h1>
          <p>
            Review your items, adjust quantities, and continue to secure checkout when you are
            ready.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{itemCount} items</span>
            <span className="pill">Secure checkout</span>
            <span className="pill">Ships within the United States</span>
          </div>
        </div>

        {params.status === "added" ? <p className="notice">Item added to your cart.</p> : null}
        {params.status === "coupon-updated" ? (
          <p className="notice">Your coupon update has been applied to the cart.</p>
        ) : null}
        {params.error === "empty-cart" ? <p className="notice">Your cart is empty.</p> : null}
        {params.error === "coupon-invalid" ? (
          <p className="notice">That coupon code is not active or could not be found.</p>
        ) : null}
        {params.error === "coupon-not-eligible" ? (
          <p className="notice">That coupon does not apply to the product IDs currently in your cart.</p>
        ) : null}
        {params.error === "coupon-used" ? (
          <p className="notice">That coupon has already been used and can no longer be applied.</p>
        ) : null}
        {params.error === "coupon-conflict" ? (
          <p className="notice">These coupons cannot be used together because at least one of them is marked for standalone use only.</p>
        ) : null}
        {params.error === "account" ? (
          <p className="notice">Please sign in with the password for that email, or continue and we will send account access to your inbox.</p>
        ) : null}

        {lines.length === 0 ? (
          <div className="empty-state">
            <p className="eyebrow">Your bag is empty</p>
            <h1>Add a product to get started.</h1>
            <p>Explore the collection and build a routine that feels light, smooth, and radiant.</p>
            <ButtonLink href="/shop" variant="primary">
              Browse products
            </ButtonLink>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="admin-table">
              <h2>Your items</h2>
              <div className="cart-lines">
                {lines.map((line) => (
                  <article key={line.product.id} className="cart-line">
                    <div className="cart-line__media">
                      <Image src={line.product.imageUrl} alt={line.product.name} width={220} height={220} />
                    </div>
                    <div className="cart-line__content">
                      <div>
                        <p className="eyebrow">{line.product.category}</p>
                        <h3>{line.product.name}</h3>
                        <p>{line.product.shortDescription}</p>
                      </div>
                      <div className="cart-line__controls">
                        <form action={updateCartItemAction} className="cart-line__form">
                          <input type="hidden" name="productId" value={line.product.id} />
                          <label htmlFor={`qty-${line.product.id}`}>Qty</label>
                          <select id={`qty-${line.product.id}`} name="quantity" defaultValue={String(line.quantity)}>
                            {Array.from({ length: 10 }, (_, index) => (
                              <option key={index + 1} value={index + 1}>
                                {index + 1}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="button button--secondary">
                            Update
                          </button>
                        </form>
                        <form action={removeCartItemAction}>
                          <input type="hidden" name="productId" value={line.product.id} />
                          <button type="submit" className="button button--ghost">
                            Remove
                          </button>
                        </form>
                      </div>
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
              <section className="cart-coupon-panel">
                <div>
                  <h3>Coupon code</h3>
                  <p className="form-note">
                    Apply your code here first. Once the price updates in the cart, you can safely
                    continue to checkout.
                  </p>
                </div>
                <form action={updateCartCouponsAction} className="checkout-form">
                  <div className="field">
                    <label htmlFor="cart-coupon-codes">Coupon code(s)</label>
                    <input
                      id="cart-coupon-codes"
                      name="couponCodes"
                      defaultValue={couponCodes.join(", ")}
                      placeholder="Enter one or more codes, separated by commas"
                    />
                    <p className="form-note">
                      Product-specific coupons match against Product IDs. If any selected coupon is
                      marked for standalone use, it cannot be combined with another code.
                    </p>
                  </div>
                  <button type="submit" className="button button--secondary">
                    Update
                  </button>
                </form>

                {appliedCoupons.length > 0 ? (
                  <div className="cart-coupon-panel__applied">
                    {appliedCoupons.map((coupon) => (
                      <div key={coupon.id} className="pill">
                        <strong>{coupon.code}</strong>
                        <span>{formatCouponValue(coupon)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
              <form action={clearCartAction}>
                <button type="submit" className="button button--ghost">
                  Clear cart
                </button>
              </form>
            </section>

            <aside className="admin-form cart-summary">
              <h2>Checkout</h2>
              <p>Subtotal</p>
              <div className="product-detail__price">
                {discountCents > 0 ? (
                  <>
                    <span className="product-price-stack__original">
                      {formatCurrency(subtotalCents)}
                    </span>
                    <strong>{formatCurrency(discountedSubtotalCents)}</strong>
                  </>
                ) : (
                  <strong>{formatCurrency(subtotalCents)}</strong>
                )}
              </div>
              {discountCents > 0 ? (
                <p className="form-note">Coupon savings applied: {formatCurrency(discountCents)}</p>
              ) : null}
              <p>Shipping and taxes are calculated during secure checkout.</p>
              {!currentCustomer ? (
                <p>
                  Returning customer? <Link href="/account/login" className="link-inline">Sign in</Link>. New here? You can continue with your email and we will help set up your account after checkout.
                </p>
              ) : (
                <p>
                  Signed in as <strong>{currentCustomer.email}</strong>.
                </p>
              )}
              <form action="/api/checkout" method="post" className="checkout-form">
                <div className="field">
                  <label htmlFor="checkout-email">Email</label>
                  <input
                    id="checkout-email"
                    name="email"
                    type="email"
                    defaultValue={currentCustomer?.email ?? ""}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="checkout-first-name">First name</label>
                    <input
                      id="checkout-first-name"
                      name="firstName"
                      defaultValue={currentCustomer?.firstName ?? ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="checkout-last-name">Last name</label>
                    <input
                      id="checkout-last-name"
                      name="lastName"
                    defaultValue={currentCustomer?.lastName ?? ""}
                  />
                </div>
              </div>
                <button type="submit" className="button button--primary">
                  Proceed to checkout
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
