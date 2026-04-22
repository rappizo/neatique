import { prisma } from "@/lib/db";
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

  const transition = resolveOrderAccountingTransition({
    previousStatus: existingOrder.status as OrderStatus,
    nextStatus: status,
    totalCents: existingOrder.totalCents,
    pointsEarned: existingOrder.pointsEarned,
    hasCoupon: Boolean(existingOrder.couponId)
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

    return tx.order.update({
      where: { id: existingOrder.id },
      data: {
        status,
        fulfillmentStatus,
        notes
      },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        notes: true
      }
    });
  });

  return {
    order: updatedOrder,
    transition,
    summary: describeOrderAccountingTransition(transition)
  };
}

export function isOrderConflictError(error: unknown): error is OrderUpdateError {
  return error instanceof OrderUpdateError;
}
