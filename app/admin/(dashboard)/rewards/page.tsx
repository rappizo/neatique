import { adjustCustomerPointsAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { getCustomers, getRewards } from "@/lib/queries";

type AdminRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRewardsPage({ searchParams }: AdminRewardsPageProps) {
  const [customers, rewards, params] = await Promise.all([
    getCustomers(),
    getRewards(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points</p>
        <h1>Manage loyalty balances and keep a visible history of adjustments.</h1>
        <p>
          This page is prepared for your points system, including manual adjustments, future earned
          points, and post-purchase loyalty activity.
        </p>
      </div>

      {params.status ? <p className="notice">Rewards action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <h2>Manual point adjustment</h2>
        <form action={adjustCustomerPointsAction}>
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="customerId">Customer</label>
              <select id="customerId" name="customerId" required>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="points">Points</label>
              <input id="points" name="points" type="number" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="note">Note</label>
            <textarea id="note" name="note" defaultValue="Manual loyalty adjustment" />
          </div>
          <button type="submit" className="button button--primary">
            Apply adjustment
          </button>
        </form>
      </section>

      <section className="admin-table">
        <h2>Rewards ledger</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Points</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id}>
                <td>{formatDate(reward.createdAt)}</td>
                <td>{reward.customerEmail}</td>
                <td>{reward.type}</td>
                <td>{reward.points}</td>
                <td>{reward.note || "No note"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
