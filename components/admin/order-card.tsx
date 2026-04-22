"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type {
  FulfillmentStatus,
  OrderActivityLogRecord,
  OrderRecord,
  OrderStatus
} from "@/lib/types";

type OrderCardProps = {
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

export function OrderCard({ order }: OrderCardProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>(
    order.fulfillmentStatus
  );
  const [notes, setNotes] = useState(order.notes ?? "");
  const [activityLogs, setActivityLogs] = useState<OrderActivityLogRecord[]>(order.activityLogs ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

        if (payload?.activityLog) {
          setActivityLogs((current) => [
            {
              id: payload.activityLog!.id,
              eventType: payload.activityLog!.eventType,
              summary: payload.activityLog!.summary,
              detail: payload.activityLog!.detail ?? null,
              createdAt: new Date(payload.activityLog!.createdAt)
            },
            ...current.filter((entry) => entry.id !== payload.activityLog!.id)
          ]);
        }

        setMessage(payload?.summary || "Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Order update failed.");
      }
    });
  };

  return (
    <section className="admin-form">
      <div className="checkout-confirmation-form__header">
        <div>
          <p className="eyebrow">{order.orderNumber}</p>
          <h2>{formatCurrency(order.totalCents)}</h2>
        </div>
        <div className="stack-row">
          <span className="pill">{status}</span>
          <span className="pill">{fulfillmentStatus}</span>
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

      <div>
        <div className="admin-form__grid">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>
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
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
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
                message.includes("failed") || message.includes("Not enough") || message.includes("not found")
                  ? "form-note notice--warning"
                  : "form-note"
              }
            >
              {message}
            </span>
          ) : null}
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-review-pagination">
          <div>
            <h3>Activity log</h3>
            <p className="form-note">Recent admin-side updates for this order.</p>
          </div>
          <div className="stack-row">
            <span className="pill">{activityLogs.length} entries</span>
          </div>
        </div>
        {activityLogs.length > 0 ? (
          <div className="admin-table__cell-stack">
            {activityLogs.map((entry) => (
              <div key={entry.id} className="admin-card">
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
    </section>
  );
}
