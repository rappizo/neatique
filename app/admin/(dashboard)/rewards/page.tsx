import Image from "next/image";
import Link from "next/link";
import { adjustCustomerPointsAction, updateMascotRedemptionAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { getCustomers, getMascotRedemptions, getMascotRewards, getRewards } from "@/lib/queries";

type AdminRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRewardsPage({ searchParams }: AdminRewardsPageProps) {
  const [customers, rewards, mascots, redemptions, params] = await Promise.all([
    getCustomers(),
    getRewards(),
    getMascotRewards(),
    getMascotRedemptions(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points</p>
        <h1>Manage loyalty balances, mascot rewards, and redemption requests.</h1>
        <p>
          Reward points can be earned and adjusted here, but they are never used as cash discounts.
          They are reserved for mascot redemptions and future loyalty experiences.
        </p>
      </div>

      {params.status ? <p className="notice">Rewards action completed: {params.status}.</p> : null}

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{mascots.filter((mascot) => mascot.active).length}</strong>
          <span>Active mascots</span>
        </div>
        <div className="stat-card">
          <strong>{redemptions.filter((redemption) => redemption.status === "REQUESTED").length}</strong>
          <span>Pending redemptions</span>
        </div>
        <div className="stat-card">
          <strong>{redemptions.filter((redemption) => redemption.status === "FULFILLED").length}</strong>
          <span>Fulfilled redemptions</span>
        </div>
      </div>

      <section className="admin-form">
        <div className="stack-row">
          <div>
            <h2>Mascot rewards</h2>
            <p className="form-note">
              Each mascot should normally stay at 1,000 points. Create more mascots here and open a
              card to edit the image, SKU, copy, and availability.
            </p>
          </div>
          <Link href="/admin/rewards/mascots/new" className="button button--primary">
            Create mascot
          </Link>
        </div>

        <div className="admin-product-grid admin-product-grid--compact">
          {mascots.map((mascot) => (
            <article key={mascot.id} className="admin-product-card">
              <div className="admin-product-card__media">
                <Image src={mascot.imageUrl} alt={mascot.name} width={420} height={420} unoptimized />
              </div>
              <div className="admin-product-card__body">
                <div className="product-card__meta">
                  <span>{mascot.sku}</span>
                  <span>{mascot.active ? "ACTIVE" : "INACTIVE"}</span>
                  <span>{mascot.pointsCost} pts</span>
                </div>
                <h3>{mascot.name}</h3>
                <p>{mascot.description || "No description yet."}</p>
                <div className="product-card__meta">
                  <span>{mascot.redemptionCount ?? 0} redemptions</span>
                </div>
                <div className="stack-row">
                  <Link href={`/admin/rewards/mascots/${mascot.id}`} className="button button--primary">
                    Edit
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

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

      <section className="admin-table admin-table--scroll">
        <h2>Redemption requests</h2>
        <table>
          <thead>
            <tr>
              <th>Submitted</th>
              <th>Mascot</th>
              <th>Customer</th>
              <th>Shipping address</th>
              <th>Points spent</th>
              <th>Status</th>
              <th>Note</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.length > 0 ? (
              redemptions.map((redemption) => {
                const formId = `mascot-redemption-${redemption.id}`;

                return (
                  <tr key={redemption.id}>
                    <td>{formatDate(redemption.createdAt)}</td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{redemption.mascotName}</strong>
                        <span>{redemption.mascotSku}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-table__cell-stack">
                        <strong>{redemption.fullName}</strong>
                        <span>{redemption.email}</span>
                      </div>
                    </td>
                    <td className="admin-table__clip">
                      {[redemption.address1, redemption.address2, redemption.city, redemption.state, redemption.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td>{redemption.pointsSpent}</td>
                    <td>
                      <label className="admin-table__checkbox-label">
                        <input
                          type="checkbox"
                          name="fulfilled"
                          defaultChecked={redemption.status === "FULFILLED"}
                          form={formId}
                        />
                        <span>{redemption.status}</span>
                      </label>
                    </td>
                    <td>
                      <textarea
                        className="admin-table__textarea"
                        name="adminNote"
                        defaultValue={redemption.adminNote || ""}
                        form={formId}
                      />
                    </td>
                    <td className="admin-table__actions">
                      <form id={formId} action={updateMascotRedemptionAction}>
                        <input type="hidden" name="id" value={redemption.id} />
                        <input type="hidden" name="redirectTo" value="/admin/rewards" />
                      </form>
                      <button type="submit" className="button button--primary" form={formId}>
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>No mascot redemption requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
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
