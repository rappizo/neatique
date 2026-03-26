import { updateCustomerAction } from "@/app/admin/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCustomerAccountById, getCustomers } from "@/lib/queries";

type AdminCustomersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  const customers = await getCustomers();
  const params = await searchParams;
  const customerAccounts = await Promise.all(
    customers.map((customer) => getCustomerAccountById(customer.id))
  );

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Users</p>
        <h1>Track customer profiles, lifetime spend, and marketing status.</h1>
        <p>
          This module gives the team a clear view of your current customer base and helps connect
          future CRM, loyalty, and retention campaigns.
        </p>
      </div>

      {params.status ? <p className="notice">Customer action completed: {params.status}.</p> : null}

      <div className="cards-2">
        {customers.map((customer, index) => {
          const account = customerAccounts[index];

          return (
            <section key={customer.id} className="admin-card">
              <h3>
                {customer.firstName || "Customer"} {customer.lastName || ""}
              </h3>
              <p>{customer.email}</p>
              <ul className="admin-list">
                <li>Loyalty points: {customer.loyaltyPoints}</li>
                <li>Total spent: {formatCurrency(customer.totalSpentCents)}</li>
                <li>Marketing opt-in: {customer.marketingOptIn ? "Yes" : "No"}</li>
                <li>Orders: {customer.orderCount ?? 0}</li>
                <li>Reviews: {customer.reviewCount ?? 0}</li>
                <li>Joined: {formatDate(customer.createdAt)}</li>
              </ul>
              <form action={updateCustomerAction} className="admin-inline-form">
                <input type="hidden" name="id" value={customer.id} />
                <div className="form-row">
                  <div className="field">
                    <label>First name</label>
                    <input name="firstName" defaultValue={customer.firstName ?? ""} />
                  </div>
                  <div className="field">
                    <label>Last name</label>
                    <input name="lastName" defaultValue={customer.lastName ?? ""} />
                  </div>
                </div>
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    defaultChecked={customer.marketingOptIn}
                  />
                  Marketing opt-in
                </label>
                <button type="submit" className="button button--secondary">
                  Save customer
                </button>
              </form>
              {account?.orders.length ? (
                <>
                  <h3>Customer orders</h3>
                  <ul className="admin-list">
                    {account.orders.map((order) => (
                      <li key={order.id}>
                        {order.orderNumber} · {order.status} · {formatCurrency(order.totalCents)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
