import Link from "next/link";
import { saveOrderEmailSettingsAction } from "@/app/admin/actions";
import { OrderTableRow } from "@/components/admin/order-table-row";
import { formatDate, formatTime } from "@/lib/format";
import { getOrders } from "@/lib/queries";

type AdminOrdersPageProps = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const orderPage = await getOrders(Number.isFinite(requestedPage) ? requestedPage : 1, 50);
  const { orders, totalCount, currentPage, totalPages, pageSize, emailOverview } = orderPage;
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

      <section className="admin-table admin-table--scroll">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Fulfillment</th>
              <th>Items</th>
              <th>Logs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrderTableRow key={order.id} order={order} />
            ))}
          </tbody>
        </table>
      </section>

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

      <section id="order-email-settings" className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Customer order email settings</h2>
            <p className="form-note">Automatic order emails and editable customer-facing copy.</p>
          </div>
          <span className="pill">2 rules</span>
        </div>
        <form action={saveOrderEmailSettingsAction}>
          <div className="admin-order-email-settings">
            {emailOverview.templates.map((template) => (
              <section key={template.eventKey} className="admin-card admin-order-email-template">
                <div className="admin-review-pagination">
                  <div>
                    <h3>{template.eventLabel}</h3>
                    <p className="form-note">{template.description}</p>
                  </div>
                  <div className="stack-row">
                    <span className="pill">{template.enabled ? "Enabled" : "Paused"}</span>
                    <span className="pill">
                      {template.sentCount} sent / {template.failedCount} failed
                    </span>
                  </div>
                </div>
                <label className="admin-order-email-toggle">
                  <input
                    type="checkbox"
                    name={`${template.eventKey}_enabled`}
                    defaultChecked={template.enabled}
                  />
                  <span>Send this email automatically</span>
                </label>
                <div className="field">
                  <label htmlFor={`subject-${template.eventKey}`}>Subject</label>
                  <input
                    id={`subject-${template.eventKey}`}
                    name={`subject_${template.eventKey}`}
                    defaultValue={template.subject}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`body-${template.eventKey}`}>Email content</label>
                  <textarea
                    id={`body-${template.eventKey}`}
                    name={`body_${template.eventKey}`}
                    className="admin-table__textarea admin-order-email-template__body"
                    defaultValue={template.bodyText}
                  />
                </div>
                <p className="form-note">
                  Variables: [Customer Name], [Order Number], [Order Total], [Order Items],
                  [Shipping Carrier], [Tracking Numbers].
                </p>
              </section>
            ))}
          </div>
          <button type="submit" className="button button--primary">
            Save order email settings
          </button>
        </form>
      </section>

      <section id="order-email-list" className="admin-table admin-table--scroll">
        <div className="admin-review-pagination">
          <div>
            <h2>Customer order email list</h2>
            <p className="form-note">Latest automatic order email delivery attempts.</p>
          </div>
          <span className="pill">{emailOverview.logs.length} recent emails</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Rule</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {emailOverview.logs.length > 0 ? (
              emailOverview.logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="admin-table__cell-stack">
                      <span>{formatDate(log.createdAt)}</span>
                      <span className="form-note">{formatTime(log.createdAt)}</span>
                    </div>
                  </td>
                  <td>{log.eventLabel}</td>
                  <td>{log.orderNumber || log.orderId}</td>
                  <td>{log.recipientEmail}</td>
                  <td>
                    <span
                      className={
                        log.deliveryStatus === "FAILED"
                          ? "admin-table__status-badge admin-table__status-badge--danger"
                          : "admin-table__status-badge admin-table__status-badge--success"
                      }
                    >
                      {log.deliveryStatus}
                    </span>
                    {log.errorReason ? <p className="form-note">{log.errorReason}</p> : null}
                  </td>
                  <td>{log.subject}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No automatic order emails yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
