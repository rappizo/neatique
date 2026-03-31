import Link from "next/link";
import { logoutCustomerAction, updateCustomerPasswordAction } from "@/app/(site)/account/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountById } from "@/lib/queries";

type AccountPageProps = {
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const customerId = await requireCustomerSession();
  const [account, params] = await Promise.all([getCustomerAccountById(customerId), searchParams]);

  if (!account) {
    return null;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">My Account</p>
          <h1>
            Welcome back, {account.customer.firstName || account.customer.email.split("@")[0]}.
          </h1>
          <p>
            This account center is ready for orders, loyalty tracking, product reviews, and future
            customer features such as wishlists or subscriptions.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{account.orders.length} orders</span>
            <span className="pill">{account.customer.loyaltyPoints} points</span>
            <span className="pill">{account.reviews.length} reviews</span>
          </div>
        </div>

        {params.status === "password-updated" ? (
          <p className="notice">Your password was updated.</p>
        ) : null}
        {params.error === "password" ? (
          <p className="notice">Your current password was incorrect.</p>
        ) : null}

        <div className="account-dashboard">
          <div className="cards-2">
            <section className="admin-card account-profile-card">
            <h3>Profile</h3>
            <ul className="admin-list account-profile-card__list">
              <li>Email: {account.customer.email}</li>
              <li>
                Name: {[account.customer.firstName, account.customer.lastName].filter(Boolean).join(" ") || "Not set"}
              </li>
              <li>Points balance: {account.customer.loyaltyPoints}</li>
              <li>Last login: {formatDate(account.customer.lastLoginAt)}</li>
            </ul>
            <div className="stack-row account-profile-card__actions">
              <Link href="/rd" className="button button--primary">
                Redeem mascots
              </Link>
              <form action={logoutCustomerAction}>
                <button type="submit" className="button button--ghost">
                  Log out
                </button>
              </form>
            </div>
            </section>

            <section className="admin-form">
              <h2>Change password</h2>
              <form action={updateCustomerPasswordAction}>
                <div className="field">
                  <label htmlFor="currentPassword">Current password</label>
                  <input id="currentPassword" name="currentPassword" type="password" />
                </div>
                <div className="field">
                  <label htmlFor="newPassword">New password</label>
                  <input id="newPassword" name="newPassword" type="password" required />
                </div>
                <button type="submit" className="button button--primary">
                  Update password
                </button>
              </form>
            </section>
          </div>

          <div className="cards-2">
            <section className="admin-table">
              <h2>Orders</h2>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {account.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div>{order.orderNumber}</div>
                        {order.couponCode ? (
                          <small>
                            {order.couponCode} saved {formatCurrency(order.discountCents)}
                          </small>
                        ) : null}
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{order.status}</td>
                      <td>{formatCurrency(order.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="admin-table">
              <h2>Points ledger</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Points</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {account.rewards.map((reward) => (
                    <tr key={reward.id}>
                      <td>{formatDate(reward.createdAt)}</td>
                      <td>{reward.type}</td>
                      <td>{reward.points}</td>
                      <td>{reward.note || "No note"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="admin-table">
            <h2>Mascot redemptions</h2>
            <table>
              <thead>
                <tr>
                  <th>Mascot</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {account.mascotRedemptions.length > 0 ? (
                  account.mascotRedemptions.map((redemption) => (
                    <tr key={redemption.id}>
                      <td>{redemption.mascotName}</td>
                      <td>{formatDate(redemption.createdAt)}</td>
                      <td>{redemption.status}</td>
                      <td>-{redemption.pointsSpent}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No mascot redemptions yet. Once your balance reaches 1,000 points, you can redeem on /rd.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="admin-table account-reviews-table">
            <h2>My reviews</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Review date</th>
                </tr>
              </thead>
              <tbody>
                {account.reviews.length > 0 ? (
                  account.reviews.map((review) => (
                    <tr key={review.id}>
                      <td>
                        {review.productName ? (
                          <Link href={`/shop/${review.productSlug}`}>{review.productName}</Link>
                        ) : (
                          "Product"
                        )}
                      </td>
                      <td>{review.rating}/5</td>
                      <td>{review.status}</td>
                      <td>{formatDate(review.reviewDate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No reviews yet. Once you complete a purchase, you can review the product page.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </section>
  );
}
