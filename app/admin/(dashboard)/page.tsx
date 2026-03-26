import { saveStoreSettingsAction } from "@/app/admin/actions";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getDashboardSummary, getStoreSettings } from "@/lib/queries";

type AdminDashboardPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const [summary, settings, params] = await Promise.all([
    getDashboardSummary(),
    getStoreSettings(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Dashboard</p>
        <h1>Keep the Neatique storefront, content engine, and loyalty flow in sync.</h1>
        <p>
          This control center covers catalog status, order activity, customer growth, points, and
          key store settings for the United States market.
        </p>
      </div>

      {params.status === "settings-saved" ? (
        <p className="notice">Store settings were updated successfully.</p>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(summary.activeProductCount)}</strong>
          <span>Active products</span>
        </div>
        <div className="stat-card">
          <strong>{formatCurrency(summary.paidRevenueCents)}</strong>
          <span>Paid revenue</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(summary.customerCount)}</strong>
          <span>Customers</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(summary.pointsIssued)}</strong>
          <span>Points issued</span>
        </div>
      </div>

      <div className="cards-2">
        <section className="admin-card">
          <h3>Low inventory watch</h3>
          <ul className="admin-list">
            {summary.lowInventoryProducts.map((product) => (
              <li key={product.id}>
                {product.name} <strong>{product.inventory}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-card">
          <h3>Recent orders</h3>
          <ul className="admin-list">
            {summary.recentOrders.map((order) => (
              <li key={order.id}>
                {order.orderNumber} · {order.email} · {formatCurrency(order.totalCents)} · {order.status}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="admin-form">
        <h2>Store settings</h2>
        <form action={saveStoreSettingsAction}>
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="shipping_region">Shipping region</label>
              <input
                id="shipping_region"
                name="shipping_region"
                defaultValue={settings.shipping_region || "United States only"}
              />
            </div>
            <div className="field">
              <label htmlFor="support_email">Support email</label>
              <input
                id="support_email"
                name="support_email"
                defaultValue={settings.support_email || "support@neatiquebeauty.com"}
              />
            </div>
            <div className="field">
              <label htmlFor="reward_rule">Reward rule</label>
              <input id="reward_rule" name="reward_rule" defaultValue={settings.reward_rule || "1 point per $1 spent"} />
            </div>
            <div className="field">
              <label htmlFor="stripe_mode">Stripe mode</label>
              <input
                id="stripe_mode"
                name="stripe_mode"
                defaultValue={settings.stripe_mode || "Add live Stripe keys to launch"}
              />
            </div>
          </div>
          <button type="submit" className="button button--primary">
            Save settings
          </button>
        </form>
      </section>
    </div>
  );
}
