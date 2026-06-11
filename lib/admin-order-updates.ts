import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import {
  buildOrderAdjustmentNote,
  describeOrderAccountingTransition,
  resolveOrderAccountingTransition
} from "@/lib/order-accounting";
import {
  buildLegacyTrackingNumber,
  deriveShipmentsFromLegacy,
  formatShipmentListSummary,
  getCompleteShipmentItems,
  getPrimaryShipmentCarrier,
  getShipmentComparisonKey,
  hasCompleteShipmentItems,
  normalizeShipmentItems,
  resolveOrderStatusFromShipments,
  resolveFulfillmentStatusFromShipments,
  type ShipmentInputLike,
  type ShipmentLike
} from "@/lib/order-shipping";
import {
  ORDER_EMAIL_EVENT_LABELS,
  sendOrderEventEmailForOrder
} from "@/lib/order-emails";
import { stripe } from "@/lib/stripe";
import type { FulfillmentStatus, OrderEmailEventKey, OrderStatus, ShippingCarrier } from "@/lib/types";

export type OrderUpdateOperation = "save" | "cancel" | "refund";

type UpdateOrderWithReconciliationInput = {
  id: string;
  operation?: OrderUpdateOperation;
  notes: string | null;
  shippingCarrier?: ShippingCarrier | null;
  trackingNumber?: string | null;
  shipments?: ShipmentInputLike[] | null;
};

export class OrderUpdateError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OrderUpdateError";
    this.statusCode = statusCode;
  }
}

function clampToZero(value: number) {
  return Math.max(0, value);
}

function normalizeNotes(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isOrderUpdateOperation(value: string): value is OrderUpdateOperation {
  return value === "save" || value === "cancel" || value === "refund";
}

function buildOrderActivityCopy(input: {
  orderNumber: string;
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  previousFulfillmentStatus: FulfillmentStatus;
  nextFulfillmentStatus: FulfillmentStatus;
  previousShippingCarrier: ShippingCarrier | null;
  nextShippingCarrier: ShippingCarrier | null;
  previousTrackingNumber: string | null;
  nextTrackingNumber: string | null;
  previousShipmentSummary: string | null;
  nextShipmentSummary: string | null;
  previousNotes: string | null;
  nextNotes: string | null;
  totalCents: number;
  pointsEarned: number;
  transitionSummary: string;
  couponUsageDelta: number;
  operation: OrderUpdateOperation;
  stripeRefundId: string | null;
}) {
  const parts: string[] = [];
  const detailParts: string[] = [];

  if (input.previousStatus !== input.nextStatus) {
    parts.push(`Status ${input.previousStatus} -> ${input.nextStatus}`);
  }

  if (input.previousFulfillmentStatus !== input.nextFulfillmentStatus) {
    parts.push(`Fulfillment ${input.previousFulfillmentStatus} -> ${input.nextFulfillmentStatus}`);
  }

  if (input.previousShipmentSummary !== input.nextShipmentSummary) {
    parts.push(input.nextShippingCarrier && input.nextTrackingNumber ? "Tracking added" : "Tracking cleared");
  }

  if (input.previousNotes !== input.nextNotes) {
    parts.push(input.nextNotes ? "Notes updated" : "Notes cleared");
  }

  if (input.operation === "cancel") {
    parts.push("Order cancelled");
  }

  if (input.operation === "refund") {
    parts.push("Refund issued");
  }

  if (parts.length === 0) {
    parts.push("Order reviewed");
  }

  detailParts.push(input.transitionSummary);

  if (input.previousStatus !== input.nextStatus) {
    detailParts.push(`Order value: ${formatCurrency(input.totalCents)}`);
  }

  if (input.previousStatus !== input.nextStatus && input.pointsEarned > 0) {
    detailParts.push(`Points tied to this order: ${input.pointsEarned}`);
  }

  if (input.couponUsageDelta > 0) {
    detailParts.push("Coupon usage was re-applied.");
  } else if (input.couponUsageDelta < 0) {
    detailParts.push("Coupon usage was released back.");
  }

  if (input.nextShipmentSummary) {
    detailParts.push(`Shipment: ${input.nextShipmentSummary}.`);
  } else {
    detailParts.push("Shipment: unshipped.");
  }

  if (input.nextNotes) {
    detailParts.push(`Current note: ${input.nextNotes}`);
  }

  if (input.stripeRefundId) {
    detailParts.push(`Stripe refund: ${input.stripeRefundId}.`);
  }

  return {
    summary: `${input.orderNumber}: ${parts.join(" | ")}`,
    detail: detailParts.join(" ")
  };
}

function mapOrderEmailLogResult(log: any) {
  const eventType: OrderEmailEventKey =
    log.eventType === "ORDER_SHIPPED" ? "ORDER_SHIPPED" : "ORDER_RECEIVED";

  return {
    id: log.id,
    eventType,
    eventLabel: ORDER_EMAIL_EVENT_LABELS[eventType],
    recipientEmail: log.recipientEmail,
    recipientName: log.recipientName ?? null,
    subject: log.subject,
    bodyText: log.bodyText,
    deliveryStatus: log.deliveryStatus === "FAILED" ? "FAILED" : "SENT",
    deliveryProvider: log.deliveryProvider ?? null,
    deliveryMessageId: log.deliveryMessageId ?? null,
    errorReason: log.errorReason ?? null,
    orderId: log.orderId,
    orderNumber: null,
    createdAt: log.createdAt
  };
}

function normalizeOrderShipments(input: ShipmentInputLike[] | null | undefined) {
  const normalized = normalizeShipmentItems(input);

  if (normalized.some((shipment) => Boolean(shipment.shippingCarrier) !== Boolean(shipment.trackingNumber))) {
    throw new OrderUpdateError("Carrier and tracking number must be filled together for every shipment.");
  }

  return getCompleteShipmentItems(normalized);
}

function resolveExistingShipments(order: {
  shipments?: ShipmentLike[] | null;
  shippingCarrier?: ShippingCarrier | string | null;
  trackingNumber?: string | null;
}) {
  const shipmentRows = getCompleteShipmentItems(order.shipments);

  if (shipmentRows.length > 0) {
    return shipmentRows;
  }

  return deriveShipmentsFromLegacy(order.shippingCarrier, order.trackingNumber);
}

export async function updateOrderWithReconciliation({
  id,
  operation = "save",
  notes,
  shippingCarrier,
  trackingNumber,
  shipments
}: UpdateOrderWithReconciliationInput) {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      shipments: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      items: {
        select: {
          productId: true,
          quantity: true,
          name: true
        }
      },
      customer: {
        select: {
          id: true,
          loyaltyPoints: true,
          totalSpentCents: true
        }
      },
      coupon: {
        select: {
          id: true,
          usageCount: true
        }
      }
    }
  });

  if (!existingOrder) {
    throw new OrderUpdateError("Order not found.", 404);
  }

  if (!isOrderUpdateOperation(operation)) {
    throw new OrderUpdateError("Unsupported order action.");
  }

  const nextNotes = normalizeNotes(notes);
  let nextShipments = normalizeOrderShipments(
    shipments ?? deriveShipmentsFromLegacy(shippingCarrier ?? null, trackingNumber ?? null)
  );
  let nextShippingCarrier = getPrimaryShipmentCarrier(nextShipments);
  let nextTrackingNumber = buildLegacyTrackingNumber(nextShipments);
  const previousShipments = resolveExistingShipments(existingOrder);
  const previousShippingCarrier = getPrimaryShipmentCarrier(previousShipments);
  const previousTrackingNumber = buildLegacyTrackingNumber(previousShipments);
  const previousShipmentSummary = formatShipmentListSummary(previousShipments);
  let nextShipmentSummary = formatShipmentListSummary(nextShipments);
  const shipmentChanged = getShipmentComparisonKey(previousShipments) !== getShipmentComparisonKey(nextShipments);
  let status: OrderStatus = existingOrder.status as OrderStatus;
  let fulfillmentStatus: FulfillmentStatus = existingOrder.fulfillmentStatus as FulfillmentStatus;
  let stripeRefundId: string | null = null;

  if (operation === "save") {
    if (
      hasCompleteShipmentItems(nextShipments) &&
      (status === "CANCELLED" || status === "REFUNDED")
    ) {
      throw new OrderUpdateError("Cancelled or refunded orders cannot be shipped.");
    }

    if (hasCompleteShipmentItems(nextShipments) && status === "PENDING") {
      throw new OrderUpdateError("Only paid orders can be shipped.");
    }

    fulfillmentStatus = resolveFulfillmentStatusFromShipments(nextShipments);
    status = resolveOrderStatusFromShipments(status, nextShipments);
  } else if (operation === "cancel") {
    if (status === "REFUNDED") {
      throw new OrderUpdateError("Refunded orders cannot be cancelled.");
    }

    status = "CANCELLED";
    fulfillmentStatus = "UNFULFILLED";
    nextShipments = [];
    nextShippingCarrier = null;
    nextTrackingNumber = null;
    nextShipmentSummary = null;
  } else if (operation === "refund") {
    if (status === "REFUNDED") {
      throw new OrderUpdateError("Order is already refunded.");
    }

    if (!stripe) {
      throw new OrderUpdateError("Stripe is not configured for refunds.", 500);
    }

    if (!existingOrder.stripePaymentIntentId) {
      throw new OrderUpdateError("This order does not have a Stripe payment intent to refund.");
    }

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: existingOrder.stripePaymentIntentId,
          metadata: {
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber
          }
        },
        {
          idempotencyKey: `neatique-order-refund-${existingOrder.id}`
        }
      );

      stripeRefundId = refund.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe refund failed.";
      throw new OrderUpdateError(`Stripe refund failed: ${message}`, 502);
    }

    status = "REFUNDED";
    fulfillmentStatus = "UNFULFILLED";
    nextShipments = [];
    nextShippingCarrier = null;
    nextTrackingNumber = null;
    nextShipmentSummary = null;
  }

  if (
    existingOrder.status === status &&
    existingOrder.fulfillmentStatus === fulfillmentStatus &&
    !shipmentChanged &&
    normalizeNotes(existingOrder.notes) === nextNotes
  ) {
    return {
      order: {
        id: existingOrder.id,
        status: existingOrder.status,
        fulfillmentStatus: existingOrder.fulfillmentStatus,
        shippingCarrier: existingOrder.shippingCarrier,
        trackingNumber: existingOrder.trackingNumber,
        notes: existingOrder.notes,
        shipments: existingOrder.shipments
      },
      transition: resolveOrderAccountingTransition({
        previousStatus: existingOrder.status as OrderStatus,
        nextStatus: status,
        totalCents: existingOrder.totalCents,
        pointsEarned: existingOrder.pointsEarned,
        hasCoupon: Boolean(existingOrder.couponId)
      }),
      activityLog: null,
      orderEmailLog: null,
      summary: "No changes to save"
    };
  }

  const transition = resolveOrderAccountingTransition({
    previousStatus: existingOrder.status as OrderStatus,
    nextStatus: status,
    totalCents: existingOrder.totalCents,
    pointsEarned: existingOrder.pointsEarned,
    hasCoupon: Boolean(existingOrder.couponId)
  });

  const activityCopy = buildOrderActivityCopy({
    orderNumber: existingOrder.orderNumber,
    previousStatus: existingOrder.status as OrderStatus,
    nextStatus: status,
    previousFulfillmentStatus: existingOrder.fulfillmentStatus as FulfillmentStatus,
    nextFulfillmentStatus: fulfillmentStatus,
    previousShippingCarrier,
    nextShippingCarrier,
    previousTrackingNumber,
    nextTrackingNumber,
    previousShipmentSummary,
    nextShipmentSummary,
    previousNotes: normalizeNotes(existingOrder.notes),
    nextNotes,
    totalCents: existingOrder.totalCents,
    pointsEarned: existingOrder.pointsEarned,
    transitionSummary: describeOrderAccountingTransition(transition),
    couponUsageDelta: transition.couponUsageDelta,
    operation,
    stripeRefundId
  });

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const inventoryItems = existingOrder.items.filter((item) => item.productId && item.quantity > 0);

    if (transition.inventoryOperation === "reserve" && inventoryItems.length > 0) {
      const productIds = inventoryItems.map((item) => item.productId as string);
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds
          }
        },
        select: {
          id: true,
          inventory: true,
          name: true
        }
      });

      const productMap = new Map(products.map((product) => [product.id, product]));

      for (const item of inventoryItems) {
        const productId = item.productId as string;
        const product = productMap.get(productId);

        if (!product) {
          throw new OrderUpdateError(`Product for ${item.name} is no longer available.`, 409);
        }

        if (product.inventory < item.quantity) {
          throw new OrderUpdateError(
            `Not enough inventory to move this order back to ${status}. ${product.name} only has ${product.inventory} unit(s) left.`,
            409
          );
        }
      }
    }

    if (transition.inventoryOperation === "restore") {
      for (const item of inventoryItems) {
        await tx.$executeRaw`
          UPDATE "Product"
          SET "inventory" = "inventory" + ${item.quantity}
          WHERE "id" = ${item.productId as string}
        `;
      }
    } else if (transition.inventoryOperation === "reserve") {
      for (const item of inventoryItems) {
        await tx.$executeRaw`
          UPDATE "Product"
          SET "inventory" = "inventory" - ${item.quantity}
          WHERE "id" = ${item.productId as string}
        `;
      }
    }

    if (existingOrder.customerId && existingOrder.customer) {
      const nextTotalSpent = clampToZero(
        existingOrder.customer.totalSpentCents + transition.customerSpendDelta
      );
      const nextLoyaltyPoints = clampToZero(
        existingOrder.customer.loyaltyPoints + transition.pointsDelta
      );

      await tx.customer.update({
        where: { id: existingOrder.customerId },
        data: {
          totalSpentCents: nextTotalSpent,
          loyaltyPoints: nextLoyaltyPoints
        }
      });

      if (transition.pointsDelta !== 0) {
        await tx.rewardEntry.create({
          data: {
            customerId: existingOrder.customerId,
            orderId: existingOrder.id,
            type: "ADJUSTMENT",
            points: transition.pointsDelta,
            note: buildOrderAdjustmentNote(existingOrder.orderNumber, status, transition.pointsDelta)
          }
        });
      }
    }

    if (existingOrder.couponId && existingOrder.coupon && transition.couponUsageDelta !== 0) {
      await tx.coupon.update({
        where: { id: existingOrder.couponId },
        data: {
          usageCount: clampToZero(existingOrder.coupon.usageCount + transition.couponUsageDelta)
        }
      });
    }

    await tx.orderShipment.deleteMany({
      where: { orderId: existingOrder.id }
    });

    if (nextShipments.length > 0) {
      await tx.orderShipment.createMany({
        data: nextShipments.map((shipment, index) => ({
          orderId: existingOrder.id,
          shippingCarrier: shipment.shippingCarrier,
          trackingNumber: shipment.trackingNumber,
          sortOrder: index
        }))
      });
    }

    const order = await tx.order.update({
      where: { id: existingOrder.id },
      data: {
        status,
        fulfillmentStatus,
        shippingCarrier: nextShippingCarrier,
        trackingNumber: nextTrackingNumber,
        notes: nextNotes
      },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        shippingCarrier: true,
        trackingNumber: true,
        notes: true,
        shipments: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            shippingCarrier: true,
            trackingNumber: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    const activityLog = await tx.orderActivityLog.create({
      data: {
        orderId: existingOrder.id,
        eventType:
          operation === "refund"
            ? "ADMIN_REFUND"
            : operation === "cancel"
              ? "ADMIN_CANCEL"
              : "ADMIN_UPDATE",
        summary: activityCopy.summary,
        detail: activityCopy.detail
      },
      select: {
        id: true,
        eventType: true,
        summary: true,
        detail: true,
        createdAt: true
      }
    });

    return {
      order,
      activityLog
    };
  });

  let orderEmailLog = null;

  if (
    operation === "save" &&
    shipmentChanged &&
    hasCompleteShipmentItems(updatedOrder.order.shipments)
  ) {
    try {
      const sentLog = await sendOrderEventEmailForOrder(existingOrder.id, "ORDER_SHIPPED");
      orderEmailLog = sentLog ? mapOrderEmailLogResult(sentLog) : null;
    } catch (error) {
      console.error("Order shipped email delivery failed:", error);
    }
  }

  return {
    order: updatedOrder.order,
    transition,
    activityLog: updatedOrder.activityLog,
    orderEmailLog,
    summary: activityCopy.detail || describeOrderAccountingTransition(transition)
  };
}

export function isOrderConflictError(error: unknown): error is OrderUpdateError {
  return error instanceof OrderUpdateError;
}
