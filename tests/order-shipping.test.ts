import assert from "node:assert/strict";
import test from "node:test";
import {
  formatShippingCarrierLabel,
  normalizeShippingCarrier,
  normalizeTrackingNumber,
  resolveFulfillmentStatusFromShipment
} from "../lib/order-shipping";

test("shipping carrier labels stay customer friendly", () => {
  assert.equal(formatShippingCarrierLabel("USPS"), "USPS");
  assert.equal(formatShippingCarrierLabel("UPS_GROUND"), "UPS Ground");
  assert.equal(formatShippingCarrierLabel("DHL"), "DHL");
});

test("shipment details derive the fulfillment status", () => {
  assert.equal(resolveFulfillmentStatusFromShipment(null, null), "UNFULFILLED");
  assert.equal(resolveFulfillmentStatusFromShipment("USPS", ""), "UNFULFILLED");
  assert.equal(resolveFulfillmentStatusFromShipment("DHL", "JD014600006155226861"), "SHIPPED");
});

test("shipping form input is normalized before saving", () => {
  assert.equal(normalizeShippingCarrier("ups ground"), "UPS_GROUND");
  assert.equal(normalizeShippingCarrier("unknown"), null);
  assert.equal(normalizeTrackingNumber("  9400111206213850123456  "), "9400111206213850123456");
  assert.equal(normalizeTrackingNumber("   "), null);
});
