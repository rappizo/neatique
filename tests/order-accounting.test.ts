import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrderAdjustmentNote,
  isRevenueOrderStatus,
  resolveOrderAccountingTransition
} from "../lib/order-accounting";

test("revenue statuses are limited to paid and fulfilled", () => {
  assert.equal(isRevenueOrderStatus("PAID"), true);
  assert.equal(isRevenueOrderStatus("FULFILLED"), true);
  assert.equal(isRevenueOrderStatus("PENDING"), false);
  assert.equal(isRevenueOrderStatus("CANCELLED"), false);
  assert.equal(isRevenueOrderStatus("REFUNDED"), false);
});

test("moving from paid to cancelled restores inventory and reverses rewards", () => {
  const transition = resolveOrderAccountingTransition({
    previousStatus: "PAID",
    nextStatus: "CANCELLED",
    totalCents: 5998,
    pointsEarned: 84,
    hasCoupon: true
  });

  assert.deepEqual(transition, {
    changedAccounting: true,
    previousRevenue: true,
    nextRevenue: false,
    inventoryOperation: "restore",
    customerSpendDelta: -5998,
    pointsDelta: -84,
    couponUsageDelta: -1
  });
});

test("moving from refunded back to fulfilled reapplies inventory and rewards", () => {
  const transition = resolveOrderAccountingTransition({
    previousStatus: "REFUNDED",
    nextStatus: "FULFILLED",
    totalCents: 4200,
    pointsEarned: 35,
    hasCoupon: false
  });

  assert.deepEqual(transition, {
    changedAccounting: true,
    previousRevenue: false,
    nextRevenue: true,
    inventoryOperation: "reserve",
    customerSpendDelta: 4200,
    pointsDelta: 35,
    couponUsageDelta: 0
  });
});

test("moving between paid-like statuses does not double-apply accounting", () => {
  const transition = resolveOrderAccountingTransition({
    previousStatus: "PAID",
    nextStatus: "FULFILLED",
    totalCents: 4200,
    pointsEarned: 35,
    hasCoupon: true
  });

  assert.deepEqual(transition, {
    changedAccounting: false,
    previousRevenue: true,
    nextRevenue: true,
    inventoryOperation: "none",
    customerSpendDelta: 0,
    pointsDelta: 0,
    couponUsageDelta: 0
  });
});

test("order adjustment notes stay readable for both reversal and restore flows", () => {
  assert.match(
    buildOrderAdjustmentNote("NEA-1001", "CANCELLED", -42),
    /reversed 42 points/i
  );
  assert.match(
    buildOrderAdjustmentNote("NEA-1001", "PAID", 42),
    /restored 42 points/i
  );
});
