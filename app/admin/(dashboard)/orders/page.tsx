import Link from "next/link";
import { OrderCard } from "@/components/admin/order-card";
import { getOrders } from "@/lib/queries";

type AdminOrdersPageProps = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

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
          <OrderCard key={order.id} order={order} />
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
