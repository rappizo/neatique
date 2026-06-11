import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveShipmentsFromLegacy,
  formatShipmentListSummary,
  formatShippingCarrierLabel,
  normalizeShipmentItems,
  normalizeShippingCarrier,
  normalizeTrackingNumber,
  parseTrackingNumbers,
  resolveFulfillmentStatusFromShipments,
  resolveFulfillmentStatusFromShipment,
  resolveOrderStatusFromShipments,
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
  assert.equal(
    resolveFulfillmentStatusFromShipments([
      { shippingCarrier: "GOFO", trackingNumber: "GOFO123" },
      { shippingCarrier: "USPS", trackingNumber: "9400111206213850123456" }
    ]),
    "SHIPPED"
  );
});

test("shipment details derive the business order status", () => {
  assert.equal(resolveOrderStatusFromShipment("PAID", null, null), "PAID");
  assert.equal(resolveOrderStatusFromShipment("PAID", "USPS", "9400111206213850123456"), "FULFILLED");
  assert.equal(resolveOrderStatusFromShipment("FULFILLED", null, null), "PAID");
  assert.equal(resolveOrderStatusFromShipment("CANCELLED", "DHL", "JD014600006155226861"), "CANCELLED");
  assert.equal(
    resolveOrderStatusFromShipments("PAID", [
      { shippingCarrier: "GOFO", trackingNumber: "GOFO123" },
      { shippingCarrier: "USPS", trackingNumber: "9400111206213850123456" }
    ]),
    "FULFILLED"
  );
  assert.equal(resolveOrderStatusFromShipments("FULFILLED", []), "PAID");
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

test("multiple shipment rows keep their own carriers", () => {
  const shipments = normalizeShipmentItems([
    { shippingCarrier: "gofo", trackingNumber: " GOFO123 " },
    { shippingCarrier: "usps", trackingNumber: " 9400111206213850123456 " },
    { shippingCarrier: "", trackingNumber: "" }
  ]);

  assert.deepEqual(shipments, [
    { shippingCarrier: "GOFO", trackingNumber: "GOFO123", sortOrder: 0 },
    { shippingCarrier: "USPS", trackingNumber: "9400111206213850123456", sortOrder: 1 }
  ]);
  assert.equal(formatShipmentListSummary(shipments), "GOFO GOFO123; USPS 9400111206213850123456");
});

test("legacy shipment fields can be expanded into individual rows", () => {
  assert.deepEqual(deriveShipmentsFromLegacy("GOFO", "GOFO123\nGOFO456"), [
    { shippingCarrier: "GOFO", trackingNumber: "GOFO123", sortOrder: 0 },
    { shippingCarrier: "GOFO", trackingNumber: "GOFO456", sortOrder: 1 }
  ]);
});
