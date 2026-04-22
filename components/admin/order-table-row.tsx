"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type {
  FulfillmentStatus,
  OrderActivityLogRecord,
  OrderRecord,
  OrderStatus
} from "@/lib/types";

type OrderTableRowProps = {
  order: OrderRecord;
};

type OrderUpdateResponse = {
  ok: true;
  summary?: string;
  order?: {
    status: OrderStatus;
    fulfillmentStatus: FulfillmentStatus;
    notes: string | null;
  };
  activityLog?: {
    id: string;
    eventType: string;
    summary: string;
    detail: string | null;
    createdAt: string;
  } | null;
};

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Order update failed.";
  }

  const candidate = payload as { error?: string };
  return candidate.error || "Order update failed.";
}

function formatAddress(parts: Array<string | null>) {
  return parts.filter(Boolean).join(", ");
}

function getStatusBadgeClass(value: string) {
  if (value === "FULFILLED" || value === "DELIVERED" || value === "PAID") {
    return "admin-table__status-badge admin-table__status-badge--success";
  }

  if (value === "CANCELLED" || value === "REFUNDED") {
    return "admin-table__status-badge admin-table__status-badge--danger";
  }

  return "admin-table__status-badge admin-table__status-badge--warning";
}

export function OrderTableRow({ order }: OrderTableRowProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>(
    order.fulfillmentStatus
  );
  const [notes, setNotes] = useState(order.notes ?? "");
  const [activityLogs, setActivityLogs] = useState<OrderActivityLogRecord[]>(
    order.activityLogs ?? []
  );
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const itemsSummary = useMemo(
    () =>
      order.items
        .map((item) => `${item.name} x${item.quantity}`)
        .slice(0, 2)
        .join(", "),
    [order.items]
  );

  const handleSave = () => {
    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch("/api/admin/orders/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: order.id,
            status,
            fulfillmentStatus,
            notes
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload));
        }

        const payload = (await response.json().catch(() => null)) as OrderUpdateResponse | null;

        if (payload?.order) {
          setStatus(payload.order.status);
          setFulfillmentStatus(payload.order.fulfillmentStatus);
          setNotes(payload.order.notes ?? "");
        }

        const activityLog = payload?.activityLog;

        if (activityLog) {
          setActivityLogs((current) => [
            {
              id: activityLog.id,
              eventType: activityLog.eventType,
              summary: activityLog.summary,
              detail: activityLog.detail ?? null,
              createdAt: new Date(activityLog.createdAt)
            },
            ...current.filter((entry) => entry.id !== activityLog.id)
          ]);
        }

        setExpanded(true);
        setMessage(payload?.summary || "Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Order update failed.");
      }
    });
  };

  return (
    <Fragment>
      <tr>
        <td>
          <div className="admin-table__cell-stack">
            <strong>{order.orderNumber}</strong>
            <span className="form-note">
              {formatDate(order.createdAt)} {formatTime(order.createdAt)}
            </span>
          </div>
        </td>
        <td>
          <div className="admin-table__cell-stack">
            <strong>{order.email}</strong>
            <span className="form-note">{order.shippingName || order.billingName || "No name"}</span>
          </div>
        </td>
        <td>
          <div className="admin-table__cell-stack">
            <strong>{formatCurrency(order.totalCents)}</strong>
            {order.couponCode ? (
              <span className="form-note">
                {order.couponCode} · -{formatCurrency(order.discountCents)}
              </span>
            ) : (
              <span className="form-note">No coupon</span>
            )}
          </div>
        </td>
        <td>
          <div className="admin-table__cell-stack">
            <span className={getStatusBadgeClass(status)}>{status}</span>
          </div>
        </td>
        <td>
          <span className={getStatusBadgeClass(fulfillmentStatus)}>{fulfillmentStatus}</span>
        </td>
        <td className="admin-table__clip">
          <div className="admin-table__cell-stack">
            <span>{itemsSummary || "No items"}</span>
            {order.items.length > 2 ? (
              <span className="form-note">+{order.items.length - 2} more item(s)</span>
            ) : null}
          </div>
        </td>
        <td>
          <div className="admin-table__cell-stack">
            <span>{activityLogs.length}</span>
            <span className="form-note">recent updates</span>
          </div>
        </td>
        <td className="admin-table__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={8}>
            <div className="admin-order-row__details">
              <div className="admin-order-row__detail-grid">
                <section className="admin-card">
                  <h3>Shipping</h3>
                  <p>{order.shippingName || "No shipping name"}</p>
                  <p className="form-note">
                    {formatAddress([
                      order.shippingAddress1,
                      order.shippingAddress2,
                      order.shippingCity,
                      order.shippingState,
                      order.shippingPostalCode,
                      order.shippingCountry
                    ]) || "No shipping address"}
                  </p>
                </section>

                <section className="admin-card">
                  <h3>Billing</h3>
                  <p>{order.billingName || "No billing name"}</p>
                  <p className="form-note">
                    {formatAddress([
                      order.billingAddress1,
                      order.billingAddress2,
                      order.billingCity,
                      order.billingState,
                      order.billingPostalCode,
                      order.billingCountry
                    ]) || "No billing address"}
                  </p>
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

              <div className="admin-order-row__detail-grid">
                <section className="admin-card">
                  <div className="admin-form__grid">
                    <div className="field">
                      <label>Status</label>
                      <select
                        className="admin-table__select"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as OrderStatus)}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="FULFILLED">FULFILLED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="REFUNDED">REFUNDED</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Fulfillment</label>
                      <select
                        className="admin-table__select"
                        value={fulfillmentStatus}
                        onChange={(event) =>
                          setFulfillmentStatus(event.target.value as FulfillmentStatus)
                        }
                      >
                        <option value="UNFULFILLED">UNFULFILLED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Order notes</label>
                    <textarea
                      className="admin-table__textarea"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <div className="stack-row">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={handleSave}
                      disabled={isPending}
                      aria-busy={isPending}
                    >
                      {isPending ? "Saving..." : "Update order"}
                    </button>
                    {message ? (
                      <span
                        className={
                          message.includes("failed") ||
                          message.includes("Not enough") ||
                          message.includes("not found")
                            ? "form-note notice--warning"
                            : "form-note"
                        }
                      >
                        {message}
                      </span>
                    ) : null}
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-review-pagination">
                    <div>
                      <h3>Activity log</h3>
                      <p className="form-note">Recent admin-side updates for this order.</p>
                    </div>
                    <span className="pill">{activityLogs.length} entries</span>
                  </div>
                  {activityLogs.length > 0 ? (
                    <div className="admin-order-log-list">
                      {activityLogs.map((entry) => (
                        <div key={entry.id} className="admin-order-log-list__item">
                          <div className="stack-row">
                            <strong>{entry.summary}</strong>
                            <span className="form-note">
                              {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                            </span>
                          </div>
                          {entry.detail ? <p className="form-note">{entry.detail}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="form-note">No manual order updates yet.</p>
                  )}
                </section>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
