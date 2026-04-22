import type { OrderStatus } from "@/lib/types";

export type OrderInventoryOperation = "reserve" | "restore" | "none";

export type OrderAccountingTransition = {
  changedAccounting: boolean;
  previousRevenue: boolean;
  nextRevenue: boolean;
  inventoryOperation: OrderInventoryOperation;
  customerSpendDelta: number;
  pointsDelta: number;
  couponUsageDelta: number;
};

type ResolveOrderAccountingTransitionInput = {
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  totalCents: number;
  pointsEarned: number;
  hasCoupon?: boolean;
};

export function isRevenueOrderStatus(status: OrderStatus) {
  return status === "PAID" || status === "FULFILLED";
}

export function resolveOrderAccountingTransition({
  previousStatus,
  nextStatus,
  totalCents,
  pointsEarned,
  hasCoupon = false
}: ResolveOrderAccountingTransitionInput): OrderAccountingTransition {
  const previousRevenue = isRevenueOrderStatus(previousStatus);
  const nextRevenue = isRevenueOrderStatus(nextStatus);

  if (previousRevenue === nextRevenue) {
    return {
      changedAccounting: false,
      previousRevenue,
      nextRevenue,
      inventoryOperation: "none",
      customerSpendDelta: 0,
      pointsDelta: 0,
      couponUsageDelta: 0
    };
  }

  if (nextRevenue) {
    return {
      changedAccounting: true,
      previousRevenue,
      nextRevenue,
      inventoryOperation: "reserve",
      customerSpendDelta: Math.max(0, totalCents),
      pointsDelta: Math.max(0, pointsEarned),
      couponUsageDelta: hasCoupon ? 1 : 0
    };
  }

  return {
    changedAccounting: true,
    previousRevenue,
    nextRevenue,
    inventoryOperation: "restore",
    customerSpendDelta: -Math.max(0, totalCents),
    pointsDelta: -Math.max(0, pointsEarned),
    couponUsageDelta: hasCoupon ? -1 : 0
  };
}

export function buildOrderAdjustmentNote(
  orderNumber: string,
  nextStatus: OrderStatus,
  pointsDelta: number
) {
  if (pointsDelta === 0) {
    return `Order ${orderNumber} updated to ${nextStatus}`;
  }

  if (pointsDelta > 0) {
    return `Order ${orderNumber} updated to ${nextStatus}; restored ${pointsDelta} points`;
  }

  return `Order ${orderNumber} updated to ${nextStatus}; reversed ${Math.abs(pointsDelta)} points`;
}

export function describeOrderAccountingTransition(transition: OrderAccountingTransition) {
  if (!transition.changedAccounting) {
    return "Saved";
  }

  if (transition.inventoryOperation === "restore") {
    return "Saved; inventory and rewards restored";
  }

  if (transition.inventoryOperation === "reserve") {
    return "Saved; inventory and rewards applied";
  }

  return "Saved";
}
