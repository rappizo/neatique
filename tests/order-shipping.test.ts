import assert from "node:assert/strict";
import test from "node:test";
import {
  formatShippingCarrierLabel,
  normalizeShippingCarrier,
  normalizeTrackingNumber,
  parseTrackingNumbers,
  resolveFulfillmentStatusFromShipment,
  resolveOrderStatusFromShipment
} from "../lib/order-shipping";

test("shipping carrier labels stay customer friendly", () => {
  assert.equal(formatShippingCarrierLabel("USPS"), "USPS");
  assert.equal(formatShippingCarrierLabel("UPS_GROUND"), "UPS Ground");
  assert.equal(formatShippingCarrierLabel("DHL"), "DHL");
  assert.equal(formatShippingCarrierLabel("AMAZON_TBA"), "Amazon TBA");
  assert.equal(formatShippingCarrierLabel("GOFO"), "GOFO");
});

test("shipment details derive the fulfillment status", () => {
  assert.equal(resolveFulfillmentStatusFromShipment(null, null), "UNFULFILLED");
  assert.equal(resolveFulfillmentStatusFromShipment("USPS", ""), "UNFULFILLED");
  assert.equal(resolveFulfillmentStatusFromShipment("DHL", "JD014600006155226861"), "SHIPPED");
});

test("shipment details derive the business order status", () => {
  assert.equal(resolveOrderStatusFromShipment("PAID", null, null), "PAID");
  assert.equal(resolveOrderStatusFromShipment("PAID", "USPS", "9400111206213850123456"), "FULFILLED");
  assert.equal(resolveOrderStatusFromShipment("FULFILLED", null, null), "PAID");
  assert.equal(resolveOrderStatusFromShipment("CANCELLED", "DHL", "JD014600006155226861"), "CANCELLED");
});

test("shipping form input is normalized before saving", () => {
  assert.equal(normalizeShippingCarrier("ups ground"), "UPS_GROUND");
  assert.equal(normalizeShippingCarrier("amazon tba"), "AMAZON_TBA");
  assert.equal(normalizeShippingCarrier("tba"), "AMAZON_TBA");
  assert.equal(normalizeShippingCarrier("gofo"), "GOFO");
  assert.equal(normalizeShippingCarrier("unknown"), null);
  assert.equal(normalizeTrackingNumber("  9400111206213850123456  "), "9400111206213850123456");
  assert.equal(
    normalizeTrackingNumber("  9400111206213850123456  \n  JD014600006155226861  "),
    "9400111206213850123456\nJD014600006155226861"
  );
  assert.equal(normalizeTrackingNumber("   "), null);
  assert.deepEqual(parseTrackingNumbers("9400111206213850123456, JD014600006155226861"), [
    "9400111206213850123456",
    "JD014600006155226861"
  ]);
});
