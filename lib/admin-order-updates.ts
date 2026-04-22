import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import {
  buildOrderAdjustmentNote,
  describeOrderAccountingTransition,
  resolveOrderAccountingTransition
} from "@/lib/order-accounting";
import type { FulfillmentStatus, OrderStatus } from "@/lib/types";

type UpdateOrderWithReconciliationInput = {
  id: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  notes: string | null;
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

function buildOrderActivityCopy(input: {
  orderNumber: string;
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  previousFulfillmentStatus: FulfillmentStatus;
  nextFulfillmentStatus: FulfillmentStatus;
  previousNotes: string | null;
  nextNotes: string | null;
  totalCents: number;
  pointsEarned: number;
  transitionSummary: string;
  couponUsageDelta: number;
}) {
  const parts: string[] = [];
  const detailParts: string[] = [];

  if (input.previousStatus !== input.nextStatus) {
    parts.push(`Status ${input.previousStatus} → ${input.nextStatus}`);
  }

  if (input.previousFulfillmentStatus !== input.nextFulfillmentStatus) {
    parts.push(`Fulfillment ${input.previousFulfillmentStatus} → ${input.nextFulfillmentStatus}`);
  }

  if (input.previousNotes !== input.nextNotes) {
    parts.push(input.nextNotes ? "Notes updated" : "Notes cleared");
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

  if (input.nextNotes) {
    detailParts.push(`Current note: ${input.nextNotes}`);
  }

  return {
    summary: `${input.orderNumber}: ${parts.join(" · ")}`,
    detail: detailParts.join(" ")
  };
}

export async function updateOrderWithReconciliation({
  id,
  status,
  fulfillmentStatus,
  notes
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

  const nextNotes = normalizeNotes(notes);

  if (
    existingOrder.status === status &&
    existingOrder.fulfillmentStatus === fulfillmentStatus &&
    normalizeNotes(existingOrder.notes) === nextNotes
  ) {
    return {
      order: {
        id: existingOrder.id,
        status: existingOrder.status,
        fulfillmentStatus: existingOrder.fulfillmentStatus,
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
    previousNotes: normalizeNotes(existingOrder.notes),
    nextNotes,
    totalCents: existingOrder.totalCents,
    pointsEarned: existingOrder.pointsEarned,
    transitionSummary: describeOrderAccountingTransition(transition),
    couponUsageDelta: transition.couponUsageDelta
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
        notes: nextNotes
      },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        notes: true
      }
    });

    const activityLog = await tx.orderActivityLog.create({
      data: {
        orderId: existingOrder.id,
        eventType: "ADMIN_UPDATE",
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

  return {
    order: updatedOrder.order,
    transition,
    activityLog: updatedOrder.activityLog,
    summary: activityCopy.detail || describeOrderAccountingTransition(transition)
  };
}

export function isOrderConflictError(error: unknown): error is OrderUpdateError {
  return error instanceof OrderUpdateError;
}
