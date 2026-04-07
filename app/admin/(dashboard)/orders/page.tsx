import Link from "next/link";
import { OrderInlineEditor } from "@/components/admin/order-inline-editor";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrders } from "@/lib/queries";

type AdminOrdersPageProps = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

function formatAddress(parts: Array<string | null>) {
  return parts.filter(Boolean).join(", ");
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const orderPage = await getOrders(Number.isFinite(requestedPage) ? requestedPage : 1, 50);
  const { orders, totalCount, currentPage, totalPages, pageSize } = orderPage;
  const fromOrder = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toOrder = Math.min(currentPage * pageSize, totalCount);

  function buildPageHref(page: number) {
    return `/admin/orders?page=${page}`;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Orders</p>
        <h1>Monitor payment, addresses, and fulfillment from one place.</h1>
        <p>
          Every completed Stripe checkout writes the customer, coupon, shipping, billing, and line
          item details into this workspace so fulfillment can start without extra lookups.
        </p>
      </div>

      {params.status ? <p className="notice">Order action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Orders</h2>
            <p className="form-note">
              Showing {fromOrder} to {toOrder} of {totalCount} orders.
            </p>
          </div>
          <div className="stack-row">
            <span className="pill">50 per page</span>
            <span className="pill">Latest orders first</span>
          </div>
        </div>
      </section>

      <div className="cards-2">
        {orders.map((order) => (
          <section key={order.id} className="admin-form">
            <div className="checkout-confirmation-form__header">
              <div>
                <p className="eyebrow">{order.orderNumber}</p>
                <h2>{formatCurrency(order.totalCents)}</h2>
              </div>
              <div className="stack-row">
                <span className="pill">{order.status}</span>
                <span className="pill">{order.fulfillmentStatus}</span>
              </div>
            </div>

            <p className="form-note">
              {order.email} · {formatDate(order.createdAt)}
            </p>

            {order.couponCode ? (
              <p className="form-note">
                Coupon {order.couponCode} saved {formatCurrency(order.discountCents)}
              </p>
            ) : null}

            <div className="cards-2">
              <section className="admin-card">
                <h3>Shipping</h3>
                <ul className="admin-list">
                  <li>{order.shippingName || "No shipping name"}</li>
                  <li>
                    {formatAddress([
                      order.shippingAddress1,
                      order.shippingAddress2,
                      order.shippingCity,
                      order.shippingState,
                      order.shippingPostalCode,
                      order.shippingCountry
                    ]) || "No shipping address"}
                  </li>
                </ul>
              </section>

              <section className="admin-card">
                <h3>Billing</h3>
                <ul className="admin-list">
                  <li>{order.billingName || "No billing name"}</li>
                  <li>
                    {formatAddress([
                      order.billingAddress1,
                      order.billingAddress2,
                      order.billingCity,
                      order.billingState,
                      order.billingPostalCode,
                      order.billingCountry
                    ]) || "No billing address"}
                  </li>
                </ul>
              </section>
            </div>

            <section className="admin-card">
              <h3>Items</h3>
              <ul className="admin-list">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.name} x {item.quantity} · {formatCurrency(item.lineTotalCents)}
                  </li>
                ))}
              </ul>
            </section>

            <OrderInlineEditor
              orderId={order.id}
              initialStatus={order.status}
              initialFulfillmentStatus={order.fulfillmentStatus}
              initialNotes={order.notes ?? ""}
            />
          </section>
        ))}
      </div>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div className="stack-row">
            <Link
              href={currentPage > 1 ? buildPageHref(currentPage - 1) : "#"}
              className={`button button--secondary${currentPage > 1 ? "" : " button--disabled"}`}
              aria-disabled={currentPage <= 1}
            >
              Previous
            </Link>
            <span className="pill">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={currentPage < totalPages ? buildPageHref(currentPage + 1) : "#"}
              className={`button button--secondary${currentPage < totalPages ? "" : " button--disabled"}`}
              aria-disabled={currentPage >= totalPages}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
