import { prisma } from "@/lib/db";
import { sendConfiguredEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/format";
import {
  deriveShipmentsFromLegacy,
  formatShipmentListSummary,
  formatShippingCarrierLabel,
  getCompleteShipmentItems,
  hasCompleteShipmentItems
} from "@/lib/order-shipping";
import type {
  OrderEmailEventKey,
  OrderEmailLogRecord,
  OrderEmailOverviewRecord,
  OrderEmailTemplateRecord,
  OrderShipmentRecord,
  ShippingCarrier
} from "@/lib/types";

type OrderEmailSettingsMap = Record<string, string>;

type OrderEmailTemplateInput = {
  customerName?: string | null;
  customerEmail: string;
  orderNumber: string;
  orderTotal: string;
  orderItems: string;
  shippingCarrier?: string | null;
  trackingNumbers?: string | null;
};

type OrderEmailOrder = {
  id: string;
  orderNumber: string;
  email: string;
  totalCents: number;
  shippingName: string | null;
  billingName: string | null;
  shippingCarrier: ShippingCarrier | null;
  trackingNumber: string | null;
  shipments?: Array<Pick<OrderShipmentRecord, "shippingCarrier" | "trackingNumber" | "sortOrder">>;
  items?: Array<{
    name: string;
    quantity: number;
  }>;
};

export const ORDER_EMAIL_EVENT_ORDER: OrderEmailEventKey[] = ["ORDER_RECEIVED", "ORDER_SHIPPED"];

export const ORDER_EMAIL_EVENT_LABELS: Record<OrderEmailEventKey, string> = {
  ORDER_RECEIVED: "Order received",
  ORDER_SHIPPED: "Order shipped"
};

export const ORDER_EMAIL_EVENT_DESCRIPTIONS: Record<OrderEmailEventKey, string> = {
  ORDER_RECEIVED: "Sent automatically after a paid checkout creates the order.",
  ORDER_SHIPPED: "Sent automatically when an admin saves carrier and tracking details."
};

function parseBool(value: string | undefined) {
  return value === "true" || value === "1" || value === "on";
}

function getEventPrefix(eventKey: OrderEmailEventKey) {
  return eventKey === "ORDER_RECEIVED" ? "order_received" : "order_shipped";
}

function getTemplateKey(eventKey: OrderEmailEventKey, field: "enabled" | "subject" | "body") {
  return `order_email_${getEventPrefix(eventKey)}_${field}`;
}

function getDefaultTemplate(eventKey: OrderEmailEventKey) {
  if (eventKey === "ORDER_RECEIVED") {
    return {
      enabled: true,
      subject: "We received your Neatique order [Order Number]",
      bodyText:
        "Hi [Customer Name],\n\nThank you for your order. We have received your order [Order Number], and our team is preparing it now.\n\nWe expect to ship your order within 24-48 hours. We will email you again once the tracking number is ready.\n\nOrder total: [Order Total]\nItems: [Order Items]\n\nBest regards,\nNeatique Team"
    };
  }

  return {
    enabled: true,
    subject: "Your Neatique order [Order Number] has shipped",
    bodyText:
      "Hi [Customer Name],\n\nYour order [Order Number] has shipped.\n\nCarrier: [Shipping Carrier]\nTracking number(s): [Tracking Numbers]\n\nPlease keep an eye out for the delivery.\n\nBest regards,\nNeatique Team"
  };
}

export function getOrderEmailSettings(
  settings: OrderEmailSettingsMap,
  counts: Partial<Record<OrderEmailEventKey, { sent: number; failed: number }>> = {}
): OrderEmailTemplateRecord[] {
  return ORDER_EMAIL_EVENT_ORDER.map((eventKey) => {
    const defaults = getDefaultTemplate(eventKey);

    return {
      eventKey,
      eventLabel: ORDER_EMAIL_EVENT_LABELS[eventKey],
      description: ORDER_EMAIL_EVENT_DESCRIPTIONS[eventKey],
      enabled: parseBool(settings[getTemplateKey(eventKey, "enabled")] ?? String(defaults.enabled)),
      subject: settings[getTemplateKey(eventKey, "subject")] || defaults.subject,
      bodyText: settings[getTemplateKey(eventKey, "body")] || defaults.bodyText,
      sentCount: counts[eventKey]?.sent ?? 0,
      failedCount: counts[eventKey]?.failed ?? 0
    };
  });
}

export function buildOrderEmailOverview(input: {
  settings: OrderEmailSettingsMap;
  counts?: Partial<Record<OrderEmailEventKey, { sent: number; failed: number }>>;
  logs: OrderEmailLogRecord[];
}): OrderEmailOverviewRecord {
  return {
    templates: getOrderEmailSettings(input.settings, input.counts),
    logs: input.logs
  };
}

export function buildOrderEmailSettingsEntries(input: {
  enabled: Partial<Record<OrderEmailEventKey, boolean>>;
  subjects: Partial<Record<OrderEmailEventKey, string>>;
  bodies: Partial<Record<OrderEmailEventKey, string>>;
}) {
  return ORDER_EMAIL_EVENT_ORDER.flatMap((eventKey) => {
    const defaults = getDefaultTemplate(eventKey);

    return [
      [getTemplateKey(eventKey, "enabled"), input.enabled[eventKey] ? "true" : "false"],
      [getTemplateKey(eventKey, "subject"), (input.subjects[eventKey] || defaults.subject).trim()],
      [getTemplateKey(eventKey, "body"), (input.bodies[eventKey] || defaults.bodyText).trim()]
    ];
  });
}

export function renderOrderEmailTemplate(template: string, input: OrderEmailTemplateInput) {
  const customerName = (input.customerName || "there").trim() || "there";
  const trackingNumbers = input.trackingNumbers || "Not available yet";
  const shippingCarrier = input.shippingCarrier || "Not available yet";

  return template
    .replaceAll("[Customer Name]", customerName)
    .replaceAll("[Customer Email]", input.customerEmail)
    .replaceAll("[Order Number]", input.orderNumber)
    .replaceAll("[Order Total]", input.orderTotal)
    .replaceAll("[Order Items]", input.orderItems)
    .replaceAll("[Shipping Carrier]", shippingCarrier)
    .replaceAll("[Tracking Numbers]", trackingNumbers)
    .replaceAll("[Tracking Number]", trackingNumbers);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toOrderEmailHtml(bodyText: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.8;color:#2e2825">
      ${escapeHtml(bodyText).replace(/\n/g, "<br />")}
    </div>
  `;
}

function getCustomerDisplayName(order: OrderEmailOrder) {
  return order.shippingName || order.billingName || order.email.split("@")[0] || "there";
}

function getOrderItemsSummary(order: OrderEmailOrder) {
  const items = order.items ?? [];

  if (items.length === 0) {
    return "Your selected Neatique items";
  }

  return items.map((item) => `${item.name} x${item.quantity}`).join(", ");
}

function buildTemplateInput(order: OrderEmailOrder): OrderEmailTemplateInput {
  const shipments = getOrderShipmentItems(order);
  const carriers = Array.from(
    new Set(
      shipments
        .map((shipment) => formatShippingCarrierLabel(shipment.shippingCarrier))
        .filter((label): label is string => Boolean(label))
    )
  ).join(", ");

  return {
    customerName: getCustomerDisplayName(order),
    customerEmail: order.email,
    orderNumber: order.orderNumber,
    orderTotal: formatCurrency(order.totalCents),
    orderItems: getOrderItemsSummary(order),
    shippingCarrier: carriers || formatShippingCarrierLabel(order.shippingCarrier),
    trackingNumbers: formatShipmentListSummary(shipments)
  };
}

function getOrderShipmentItems(order: OrderEmailOrder) {
  const shipmentRows = getCompleteShipmentItems(order.shipments);

  if (shipmentRows.length > 0) {
    return shipmentRows;
  }

  return deriveShipmentsFromLegacy(order.shippingCarrier, order.trackingNumber);
}

async function loadOrderEmailSettingsMap() {
  const keys = ORDER_EMAIL_EVENT_ORDER.flatMap((eventKey) => [
    getTemplateKey(eventKey, "enabled"),
    getTemplateKey(eventKey, "subject"),
    getTemplateKey(eventKey, "body")
  ]);

  const rows = await prisma.storeSetting.findMany({
    where: {
      key: {
        in: keys
      }
    }
  });

  return rows.reduce<OrderEmailSettingsMap>((accumulator, setting) => {
    accumulator[setting.key] = setting.value;
    return accumulator;
  }, {});
}

function getEventTemplate(settings: OrderEmailSettingsMap, eventKey: OrderEmailEventKey) {
  return getOrderEmailSettings(settings).find((template) => template.eventKey === eventKey);
}

async function createOrderEmailLog(input: {
  order: OrderEmailOrder;
  eventKey: OrderEmailEventKey;
  subject: string;
  bodyText: string;
  deliveryStatus: "SENT" | "FAILED";
  deliveryProvider?: string | null;
  deliveryMessageId?: string | null;
  errorReason?: string | null;
}) {
  return prisma.orderEmailLog.create({
    data: {
      orderId: input.order.id,
      eventType: input.eventKey,
      recipientEmail: input.order.email,
      recipientName: getCustomerDisplayName(input.order),
      subject: input.subject,
      bodyText: input.bodyText,
      deliveryStatus: input.deliveryStatus,
      deliveryProvider: input.deliveryProvider ?? null,
      deliveryMessageId: input.deliveryMessageId ?? null,
      errorReason: input.errorReason ?? null
    }
  });
}

export async function sendOrderEventEmail(order: OrderEmailOrder, eventKey: OrderEmailEventKey) {
  if (eventKey === "ORDER_SHIPPED" && !hasCompleteShipmentItems(getOrderShipmentItems(order))) {
    return null;
  }

  const settings = await loadOrderEmailSettingsMap();
  const template = getEventTemplate(settings, eventKey);

  if (!template?.enabled) {
    return null;
  }

  const templateInput = buildTemplateInput(order);
  const subject = renderOrderEmailTemplate(template.subject, templateInput);
  const bodyText = renderOrderEmailTemplate(template.bodyText, templateInput);

  try {
    const result = await sendConfiguredEmail({
      to: order.email,
      subject,
      text: bodyText,
      html: toOrderEmailHtml(bodyText)
    });

    if (result.delivered) {
      return createOrderEmailLog({
        order,
        eventKey,
        subject,
        bodyText,
        deliveryStatus: "SENT",
        deliveryProvider: result.provider,
        deliveryMessageId: result.messageId ?? null
      });
    }

    return createOrderEmailLog({
      order,
      eventKey,
      subject,
      bodyText,
      deliveryStatus: "FAILED",
      deliveryProvider: result.provider ?? null,
      errorReason: result.reason
    });
  } catch (error) {
    return createOrderEmailLog({
      order,
      eventKey,
      subject,
      bodyText,
      deliveryStatus: "FAILED",
      errorReason: error instanceof Error ? error.message : "Order email delivery failed."
    });
  }
}

export async function sendOrderEventEmailForOrder(orderId: string, eventKey: OrderEmailEventKey) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shipments: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      items: {
        select: {
          name: true,
          quantity: true
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  return sendOrderEventEmail(
    {
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      totalCents: order.totalCents,
      shippingName: order.shippingName,
      billingName: order.billingName,
      shippingCarrier: order.shippingCarrier,
      trackingNumber: order.trackingNumber,
      shipments: order.shipments,
      items: order.items
    },
    eventKey
  );
}

export function describeShipmentForEmail(
  carrier: ShippingCarrier | null | undefined,
  trackingNumber: string | null | undefined
) {
  return formatShipmentListSummary(deriveShipmentsFromLegacy(carrier, trackingNumber)) || "Shipment details not available";
}
