import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrderReviewPath,
  buildOrderReviewUrl,
  createOrderReviewToken,
  isOrderReviewEligibleStatus,
  isValidOrderReviewToken,
  makeOrderReviewDisplayName,
  ORDER_REVIEW_SOURCE
} from "../lib/order-review";

test("order review tokens are unique 256-bit URL-safe identifiers", () => {
  const tokens = Array.from({ length: 100 }, () => createOrderReviewToken());

  assert.equal(new Set(tokens).size, tokens.length);
  assert.ok(tokens.every((token) => token.length === 43));
  assert.ok(tokens.every(isValidOrderReviewToken));
  assert.equal(isValidOrderReviewToken("short-token"), false);
  assert.equal(isValidOrderReviewToken(`${tokens[0]}!`), false);
});

test("review links use the canonical site and keep the token in one route segment", () => {
  const token = createOrderReviewToken();

  assert.equal(buildOrderReviewPath(token), `/review-order/${token}`);
  assert.equal(buildOrderReviewUrl(token), `https://www.neatiquebeauty.com/review-order/${token}`);
});

test("only paid-like orders can use no-login verified review links", () => {
  assert.equal(isOrderReviewEligibleStatus("PAID"), true);
  assert.equal(isOrderReviewEligibleStatus("FULFILLED"), true);
  assert.equal(isOrderReviewEligibleStatus("PENDING"), false);
  assert.equal(isOrderReviewEligibleStatus("CANCELLED"), false);
  assert.equal(isOrderReviewEligibleStatus("REFUNDED"), false);
});

test("order review display names avoid exposing the full customer identity", () => {
  assert.equal(
    makeOrderReviewDisplayName({
      shippingName: "Jamie Rivera",
      billingName: null,
      email: "jamie@example.com"
    }),
    "Jamie"
  );
  assert.equal(
    makeOrderReviewDisplayName({ shippingName: null, billingName: null, email: "buyer@example.com" }),
    "buyer"
  );
  assert.equal(ORDER_REVIEW_SOURCE, "ORDER_REVIEW_LINK");
});
