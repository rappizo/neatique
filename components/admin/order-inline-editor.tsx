"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FulfillmentStatus, OrderStatus } from "@/lib/types";

type OrderInlineEditorProps = {
  orderId: string;
  initialStatus: OrderStatus;
  initialFulfillmentStatus: FulfillmentStatus;
  initialNotes: string;
};

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Order update failed.";
  }

  const candidate = payload as { error?: string };
  return candidate.error || "Order update failed.";
}

export function OrderInlineEditor({
  orderId,
  initialStatus,
  initialFulfillmentStatus,
  initialNotes
}: OrderInlineEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>(initialFulfillmentStatus);
  const [notes, setNotes] = useState(initialNotes);
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
            id: orderId,
            status,
            fulfillmentStatus,
            notes
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload));
        }

        const payload = (await response.json().catch(() => null)) as
          | { summary?: string }
          | null;

        setMessage(payload?.summary || "Saved");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Order update failed.");
      }
    });
  };

  return (
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
            onChange={(event) => setFulfillmentStatus(event.target.value as FulfillmentStatus)}
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
        <button type="button" className="button button--primary" onClick={handleSave} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Saving..." : "Update order"}
        </button>
        {message ? (
          <span className={message === "Saved" ? "form-note" : "form-note notice--warning"}>{message}</span>
        ) : null}
      </div>
    </div>
  );
}
