import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrderEmailSettingsEntries,
  getOrderEmailSettings,
  renderOrderEmailTemplate
} from "../lib/order-emails";

test("order email settings expose the two automatic order rules", () => {
  const settings = getOrderEmailSettings({});

  assert.deepEqual(
    settings.map((setting) => setting.eventKey),
    ["ORDER_RECEIVED", "ORDER_SHIPPED"]
  );
  assert.equal(settings[0].enabled, true);
  assert.equal(settings[1].enabled, true);
});

test("order email settings entries persist edited copy", () => {
  const entries = buildOrderEmailSettingsEntries({
    enabled: {
      ORDER_RECEIVED: true,
      ORDER_SHIPPED: false
    },
    subjects: {
      ORDER_RECEIVED: "Received [Order Number]",
      ORDER_SHIPPED: "Shipped [Order Number]"
    },
    bodies: {
      ORDER_RECEIVED: "Hi [Customer Name]",
      ORDER_SHIPPED: "Tracking: [Tracking Numbers]"
    }
  });

  assert.ok(entries.some(([key, value]) => key === "order_email_order_received_subject" && value === "Received [Order Number]"));
  assert.ok(entries.some(([key, value]) => key === "order_email_order_shipped_enabled" && value === "false"));
});

test("order email templates render order and tracking variables", () => {
  assert.equal(
    renderOrderEmailTemplate(
      "Hi [Customer Name], [Order Number] ships with [Shipping Carrier]: [Tracking Numbers].",
      {
        customerName: "Ava",
        customerEmail: "ava@example.com",
        orderNumber: "NEA-1001",
        orderTotal: "$52.00",
        orderItems: "PDRN Cream x1",
        shippingCarrier: "GOFO",
        trackingNumbers: "GOFO123, GOFO456"
      }
    ),
    "Hi Ava, NEA-1001 ships with GOFO: GOFO123, GOFO456."
  );
});
