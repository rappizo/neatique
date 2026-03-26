import { updateOrderAction } from "@/app/admin/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrders } from "@/lib/queries";

type AdminOrdersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const [orders, params] = await Promise.all([getOrders(), searchParams]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Orders</p>
        <h1>Monitor checkout activity, fulfillment status, and customer delivery notes.</h1>
        <p>
          Stripe checkout feeds into order management so the operations team has a clear source of
          truth for payment and shipping progress.
        </p>
      </div>

      {params.status ? <p className="notice">Order action completed: {params.status}.</p> : null}

      <div className="cards-2">
        {orders.map((order) => (
          <section key={order.id} className="admin-form">
            <h2>
              {order.orderNumber} · {formatCurrency(order.totalCents)}
            </h2>
            <p>
              {order.email} · {formatDate(order.createdAt)}
            </p>
            <ul className="admin-list">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.name} x {item.quantity} · {formatCurrency(item.lineTotalCents)}
                </li>
              ))}
            </ul>
            <form action={updateOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <div className="admin-form__grid">
                <div className="field">
                  <label>Status</label>
                  <select name="status" defaultValue={order.status}>
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="FULFILLED">FULFILLED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
                <div className="field">
                  <label>Fulfillment</label>
                  <select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus}>
                    <option value="UNFULFILLED">UNFULFILLED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Order notes</label>
                <textarea name="notes" defaultValue={order.notes ?? ""} />
              </div>
              <button type="submit" className="button button--primary">
                Update order
              </button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
