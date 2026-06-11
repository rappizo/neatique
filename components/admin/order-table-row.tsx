"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import {
  deriveShipmentsFromLegacy,
  formatShipmentListSummary,
  formatShippingCarrierLabel,
  resolveOrderStatusFromShipments,
  resolveFulfillmentStatusFromShipments,
  shippingCarrierOptions
} from "@/lib/order-shipping";
import type {
  FulfillmentStatus,
  OrderEmailLogRecord,
  OrderActivityLogRecord,
  OrderRecord,
  OrderShipmentRecord,
  OrderStatus,
  ShippingCarrier
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
    shippingCarrier: ShippingCarrier | null;
    trackingNumber: string | null;
    shipments: OrderShipmentRecord[];
    notes: string | null;
  };
  activityLog?: {
    id: string;
    eventType: string;
    summary: string;
    detail: string | null;
    createdAt: string;
  } | null;
  orderEmailLog?: {
    id: string;
    eventType: "ORDER_RECEIVED" | "ORDER_SHIPPED";
    eventLabel: string;
    recipientEmail: string;
    recipientName: string | null;
    subject: string;
    bodyText: string;
    deliveryStatus: "SENT" | "FAILED";
    deliveryProvider: string | null;
    deliveryMessageId: string | null;
    errorReason: string | null;
    orderId: string;
    orderNumber: string | null;
    createdAt: string;
  } | null;
};

type OrderAction = "save" | "cancel" | "refund";
type MessageTone = "success" | "warning";
type ShipmentRow = {
  clientId: string;
  shippingCarrier: ShippingCarrier | "";
  trackingNumber: string;
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

function createBlankShipmentRow(): ShipmentRow {
  return {
    clientId: `shipment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    shippingCarrier: "",
    trackingNumber: ""
  };
}

function toShipmentRows(order: OrderRecord): ShipmentRow[] {
  const shipmentRows = order.shipments.length > 0
    ? order.shipments
    : deriveShipmentsFromLegacy(order.shippingCarrier, order.trackingNumber);

  if (shipmentRows.length === 0) {
    return [createBlankShipmentRow()];
  }

  return shipmentRows.map((shipment, index) => ({
    clientId: `${shipment.trackingNumber}-${index}`,
    shippingCarrier: shipment.shippingCarrier,
    trackingNumber: shipment.trackingNumber
  }));
}

function serializeShipmentRows(rows: ShipmentRow[]) {
  return rows.map((row) => ({
    shippingCarrier: row.shippingCarrier || null,
    trackingNumber: row.trackingNumber.trim() || null
  }));
}

function completeShipmentRows(rows: ShipmentRow[]): Array<{
  shippingCarrier: ShippingCarrier;
  trackingNumber: string;
  sortOrder: number;
}> {
  return rows
    .map((row, index) => ({
      shippingCarrier: row.shippingCarrier || null,
      trackingNumber: row.trackingNumber.trim() || null,
      sortOrder: index
    }))
    .filter(
      (row): row is { shippingCarrier: ShippingCarrier; trackingNumber: string; sortOrder: number } =>
        Boolean(row.shippingCarrier && row.trackingNumber)
    );
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

function isWarningMessage(message: string) {
  return /failed|not enough|not found|cannot|must|only|already|missing|does not/i.test(message);
}

function buildActionFeedback(
  operation: OrderAction,
  order: OrderUpdateResponse["order"] | undefined,
  fallback: string | undefined
) {
  if (operation === "save") {
    const shipmentSummary = formatShipmentListSummary(order?.shipments ?? []);

    if (shipmentSummary && order) {
      return `Shipment updated: ${shipmentSummary}. Status: ${order.status}; fulfillment: ${order.fulfillmentStatus}.`;
    }

    if (order) {
      return `Shipment cleared. Status: ${order.status}; fulfillment: ${order.fulfillmentStatus}.`;
    }

    return fallback || "Shipment updated.";
  }

  if (operation === "cancel") {
    return fallback || "Order cancelled.";
  }

  return fallback || "Refund submitted through Stripe.";
}

export function OrderTableRow({ order }: OrderTableRowProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>(
    resolveFulfillmentStatusFromShipments(order.shipments)
  );
  const [shipmentRows, setShipmentRows] = useState<ShipmentRow[]>(() => toShipmentRows(order));
  const [notes, setNotes] = useState(order.notes ?? "");
  const [activityLogs, setActivityLogs] = useState<OrderActivityLogRecord[]>(
    order.activityLogs ?? []
  );
  const [emailLogs, setEmailLogs] = useState<OrderEmailLogRecord[]>(order.emailLogs ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [activeAction, setActiveAction] = useState<OrderAction | null>(null);
  const [confirmedAction, setConfirmedAction] = useState<OrderAction | null>(null);
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
  const completeShipments = completeShipmentRows(shipmentRows);
  const shipmentSummary = formatShipmentListSummary(completeShipments);

  useEffect(() => {
    if (!confirmedAction) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConfirmedAction(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [confirmedAction]);

  const applyShipmentRows = (nextShipmentRows: ShipmentRow[]) => {
    const nextCompleteShipments = completeShipmentRows(nextShipmentRows);

    setShipmentRows(nextShipmentRows);
    setFulfillmentStatus(resolveFulfillmentStatusFromShipments(nextCompleteShipments));
    setStatus(resolveOrderStatusFromShipments(status, nextCompleteShipments));
  };

  const handleOrderAction = (operation: OrderAction) => {
    if (activeAction) {
      return;
    }

    if (
      operation === "cancel" &&
      !window.confirm("Cancel this order locally? This does not issue a Stripe refund.")
    ) {
      return;
    }

    if (
      operation === "refund" &&
      !window.confirm("Issue a full Stripe refund for this order?")
    ) {
      return;
    }

    setActiveAction(operation);
    setConfirmedAction(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/orders/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: order.id,
            operation,
            shipments: serializeShipmentRows(shipmentRows),
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
          setShipmentRows(toShipmentRows({ ...order, ...payload.order }));
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

        if (payload?.orderEmailLog) {
          const orderEmailLog = payload.orderEmailLog;

          setEmailLogs((current) => [
            {
              ...orderEmailLog,
              createdAt: new Date(orderEmailLog.createdAt)
            },
            ...current.filter((entry) => entry.id !== orderEmailLog.id)
          ]);
        }

        setExpanded(true);
        setConfirmedAction(operation);
        setMessageTone("success");
        setMessage(buildActionFeedback(operation, payload?.order, payload?.summary));
      } catch (error) {
        setMessageTone("warning");
        setMessage(error instanceof Error ? error.message : "Order update failed.");
      } finally {
        setActiveAction(null);
      }
    });
  };

  const isCancelled = status === "CANCELLED";
  const isRefunded = status === "REFUNDED";
  const hasActiveAction = isPending || Boolean(activeAction);
  const canCancel = !hasActiveAction && !isCancelled && !isRefunded;
  const canRefund = !hasActiveAction && !isRefunded && Boolean(order.stripePaymentIntentId);
  const saveButtonLabel =
    activeAction === "save"
      ? "Updating shipment..."
      : confirmedAction === "save"
        ? "Shipment updated"
        : "Update shipment";
  const feedbackTone = messageTone === "warning" || (message ? isWarningMessage(message) : false)
    ? "warning"
    : "success";

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
          <div className="admin-table__cell-stack">
            <span className={getStatusBadgeClass(fulfillmentStatus)}>{fulfillmentStatus}</span>
            {shipmentSummary ? (
              <span className="form-note">{shipmentSummary}</span>
            ) : (
              <span className="form-note">No tracking yet</span>
            )}
          </div>
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
        <td>
          <div className="admin-order-row__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? "Hide" : "View"}
            </button>
          </div>
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
                  {shipmentSummary ? (
                    <div className="admin-order-tracking-summary">
                      <p className="form-note">Tracking</p>
                      {completeShipments.map((shipment, index) => (
                        <span key={`${shipment.shippingCarrier}-${shipment.trackingNumber}-${index}`} className="pill">
                          {formatShippingCarrierLabel(shipment.shippingCarrier)} {shipment.trackingNumber}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="form-note">Shipment: unshipped</p>
                  )}
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
                <ul className="admin-order-items">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={58}
                          height={58}
                          loading="lazy"
                          unoptimized
                          className="admin-order-item__image"
                        />
                      ) : (
                        <span className="admin-order-item__image admin-order-item__image--empty" />
                      )}
                      <div className="admin-order-item__copy">
                        <strong>{item.name}</strong>
                        <span className="form-note">
                          Quantity {item.quantity} | {formatCurrency(item.lineTotalCents)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="admin-order-row__detail-grid">
                <section className="admin-card admin-order-row__control-card">
                  <div className="admin-form__grid">
                    <div className="field">
                      <label>Status</label>
                      <select className="admin-table__select" value={status} disabled>
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="FULFILLED">FULFILLED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="REFUNDED">REFUNDED</option>
                      </select>
                      <span className="form-note">Automatically updates from shipment, cancel, and refund actions.</span>
                    </div>
                    <div className="field">
                      <label>Fulfillment</label>
                      <select className="admin-table__select" value={fulfillmentStatus} disabled>
                        <option value="UNFULFILLED">UNFULFILLED</option>
                        <option value="SHIPPED">SHIPPED</option>
                      </select>
                      <span className="form-note">Automatically updates from tracking details.</span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor={`shipping-carrier-${order.id}-0`}>Tracking numbers</label>
                    <div className="admin-order-tracking-inputs">
                      {shipmentRows.map((shipment, index) => (
                        <div key={shipment.clientId} className="admin-order-tracking-input">
                          <select
                            id={index === 0 ? `shipping-carrier-${order.id}-0` : undefined}
                            className="admin-table__select"
                            value={shipment.shippingCarrier}
                            onChange={(event) => {
                              const nextShipmentRows = [...shipmentRows];
                              nextShipmentRows[index] = {
                                ...shipment,
                                shippingCarrier: event.target.value as ShippingCarrier | ""
                              };
                              applyShipmentRows(nextShipmentRows);
                            }}
                          >
                            <option value="">Select carrier</option>
                            {shippingCarrierOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            className="admin-table__select"
                            value={shipment.trackingNumber}
                            placeholder="Tracking number"
                            onChange={(event) => {
                              const nextShipmentRows = [...shipmentRows];
                              nextShipmentRows[index] = {
                                ...shipment,
                                trackingNumber: event.target.value
                              };
                              applyShipmentRows(nextShipmentRows);
                            }}
                          />
                          <button
                            type="button"
                            className="button button--ghost"
                            onClick={() => {
                              const nextShipmentRows =
                                shipmentRows.length === 1
                                  ? [createBlankShipmentRow()]
                                  : shipmentRows.filter((_, itemIndex) => itemIndex !== index);
                              applyShipmentRows(nextShipmentRows);
                            }}
                            disabled={
                              shipmentRows.length === 1 &&
                              !shipment.shippingCarrier &&
                              !shipment.trackingNumber.trim()
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => setShipmentRows((current) => [...current, createBlankShipmentRow()])}
                      >
                        Add tracking number
                      </button>
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
                  <div className="admin-order-row__shipment-actions">
                    <div className="stack-row admin-order-row__control-actions">
                      <button
                        type="button"
                        className={`button button--primary${confirmedAction === "save" ? " button--success" : ""}`}
                        onClick={() => handleOrderAction("save")}
                        disabled={hasActiveAction}
                        aria-busy={activeAction === "save"}
                      >
                        {saveButtonLabel}
                      </button>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleOrderAction("cancel")}
                        disabled={!canCancel}
                        aria-busy={activeAction === "cancel"}
                      >
                        {activeAction === "cancel" ? "Cancelling..." : "Cancel order"}
                      </button>
                      <button
                        type="button"
                        className="button button--danger"
                        onClick={() => handleOrderAction("refund")}
                        disabled={!canRefund}
                        aria-busy={activeAction === "refund"}
                      >
                        {activeAction === "refund" ? "Refunding..." : "Refund through Stripe"}
                      </button>
                    </div>
                    {message ? (
                      <div
                        className={`admin-order-row__feedback admin-order-row__feedback--${feedbackTone}`}
                        role="status"
                        aria-live="polite"
                      >
                        <strong>{feedbackTone === "warning" ? "Needs attention" : "Saved"}</strong>
                        <span>{message}</span>
                      </div>
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

              <section className="admin-card">
                <div className="admin-review-pagination">
                  <div>
                    <h3>Customer emails</h3>
                    <p className="form-note">Automatic order emails sent for this order.</p>
                  </div>
                  <span className="pill">{emailLogs.length} entries</span>
                </div>
                {emailLogs.length > 0 ? (
                  <div className="admin-order-log-list">
                    {emailLogs.map((entry) => (
                      <div key={entry.id} className="admin-order-log-list__item">
                        <div className="stack-row">
                          <strong>{entry.eventLabel}</strong>
                          <span
                            className={
                              entry.deliveryStatus === "FAILED"
                                ? "admin-table__status-badge admin-table__status-badge--danger"
                                : "admin-table__status-badge admin-table__status-badge--success"
                            }
                          >
                            {entry.deliveryStatus}
                          </span>
                          <span className="form-note">
                            {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="form-note">{entry.subject}</p>
                        {entry.errorReason ? <p className="form-note">{entry.errorReason}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="form-note">No automatic order emails yet.</p>
                )}
              </section>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
