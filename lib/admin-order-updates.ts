import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import {
  buildOrderAdjustmentNote,
  describeOrderAccountingTransition,
  resolveOrderAccountingTransition
} from "@/lib/order-accounting";
import {
  formatShipmentSummary,
  hasCompleteShipment,
  normalizeShippingCarrier,
  normalizeTrackingNumber,
  resolveOrderStatusFromShipment,
  resolveFulfillmentStatusFromShipment
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
  shippingCarrier: ShippingCarrier | null;
  trackingNumber: string | null;
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

  if (
    input.previousShippingCarrier !== input.nextShippingCarrier ||
    input.previousTrackingNumber !== input.nextTrackingNumber
  ) {
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

  const shipmentSummary = formatShipmentSummary(input.nextShippingCarrier, input.nextTrackingNumber);

  if (shipmentSummary) {
    detailParts.push(`Shipment: ${shipmentSummary}.`);
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

export async function updateOrderWithReconciliation({
  id,
  operation = "save",
  notes,
  shippingCarrier,
  trackingNumber
}: UpdateOrderWithReconciliationInput) {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: {
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
  let nextShippingCarrier = normalizeShippingCarrier(shippingCarrier);
  let nextTrackingNumber = normalizeTrackingNumber(trackingNumber);

  if (Boolean(nextShippingCarrier) !== Boolean(nextTrackingNumber)) {
    throw new OrderUpdateError("Carrier and Tracking Number must be filled together.");
  }

  const previousShippingCarrier = normalizeShippingCarrier(existingOrder.shippingCarrier);
  const previousTrackingNumber = normalizeTrackingNumber(existingOrder.trackingNumber);
  const shipmentChanged =
    previousShippingCarrier !== nextShippingCarrier ||
    previousTrackingNumber !== nextTrackingNumber;
  let status: OrderStatus = existingOrder.status as OrderStatus;
  let fulfillmentStatus: FulfillmentStatus = existingOrder.fulfillmentStatus as FulfillmentStatus;
  let stripeRefundId: string | null = null;

  if (operation === "save") {
    if (
      nextShippingCarrier &&
      nextTrackingNumber &&
      (status === "CANCELLED" || status === "REFUNDED")
    ) {
      throw new OrderUpdateError("Cancelled or refunded orders cannot be shipped.");
    }

    if (nextShippingCarrier && nextTrackingNumber && status === "PENDING") {
      throw new OrderUpdateError("Only paid orders can be shipped.");
    }

    fulfillmentStatus = resolveFulfillmentStatusFromShipment(
      nextShippingCarrier,
      nextTrackingNumber
    );
    status = resolveOrderStatusFromShipment(status, nextShippingCarrier, nextTrackingNumber);
  } else if (operation === "cancel") {
    if (status === "REFUNDED") {
      throw new OrderUpdateError("Refunded orders cannot be cancelled.");
    }

    status = "CANCELLED";
    fulfillmentStatus = "UNFULFILLED";
    nextShippingCarrier = null;
    nextTrackingNumber = null;
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
    nextShippingCarrier = null;
    nextTrackingNumber = null;
  }

  if (
    existingOrder.status === status &&
    existingOrder.fulfillmentStatus === fulfillmentStatus &&
    previousShippingCarrier === nextShippingCarrier &&
    previousTrackingNumber === nextTrackingNumber &&
    normalizeNotes(existingOrder.notes) === nextNotes
  ) {
    return {
      order: {
        id: existingOrder.id,
        status: existingOrder.status,
        fulfillmentStatus: existingOrder.fulfillmentStatus,
        shippingCarrier: existingOrder.shippingCarrier,
        trackingNumber: existingOrder.trackingNumber,
        notes: existingOrder.notes
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
        notes: true
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
    hasCompleteShipment(updatedOrder.order.shippingCarrier, updatedOrder.order.trackingNumber)
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
