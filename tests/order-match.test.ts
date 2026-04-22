import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrderMatchErrorMessage,
  isHighRating,
  validateOrderId
} from "../lib/order-match";

test("order ID validation matches supported platform formats", () => {
  assert.equal(validateOrderId("amazon", "114-6436158-9879408"), true);
  assert.equal(validateOrderId("amazon", "214-6436158-9879408"), false);
  assert.equal(validateOrderId("tiktok", "512345678901234567"), true);
  assert.equal(validateOrderId("tiktok", "412345678901234567"), false);
  assert.equal(validateOrderId("walmart", "200ABCDEF123456"), true);
  assert.equal(validateOrderId("walmart", "199ABCDEF123456"), false);
});

test("order match error messaging stays customer-friendly", () => {
  assert.match(
    getOrderMatchErrorMessage("duplicate-order", "RYO registration") || "",
    /completed RYO registration/i
  );
  assert.equal(
    getOrderMatchErrorMessage("missing"),
    "Please complete Order ID, Name, and Email before continuing."
  );
});

test("high-rating threshold starts at four stars", () => {
  assert.equal(isHighRating(4), true);
  assert.equal(isHighRating(3), false);
});
