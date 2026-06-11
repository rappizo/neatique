import type { FulfillmentStatus, OrderStatus, ShippingCarrier } from "@/lib/types";

export const shippingCarrierOptions: Array<{ value: ShippingCarrier; label: string }> = [
  { value: "USPS", label: "USPS" },
  { value: "UPS_GROUND", label: "UPS Ground" },
  { value: "DHL", label: "DHL" },
  { value: "AMAZON_TBA", label: "Amazon TBA" },
  { value: "GOFO", label: "GOFO" }
];

const shippingCarrierLabels = new Map(
  shippingCarrierOptions.map((option) => [option.value, option.label])
);
const shippingCarrierValues = new Set(shippingCarrierOptions.map((option) => option.value));

export function normalizeShippingCarrier(value: string | null | undefined): ShippingCarrier | null {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "TBA") {
    return "AMAZON_TBA";
  }

  const carrier = normalized.replace(/\s+/g, "_") as ShippingCarrier;

  if (shippingCarrierValues.has(carrier)) {
    return carrier;
  }

  return null;
}

export function normalizeTrackingNumber(value: string | null | undefined) {
  const trackingNumbers = parseTrackingNumbers(value);
  return trackingNumbers.length > 0 ? trackingNumbers.join("\n") : null;
}

export function parseTrackingNumbers(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatTrackingNumbers(value: string | null | undefined) {
  return parseTrackingNumbers(value).join(", ");
}

export function hasCompleteShipment(
  carrier: ShippingCarrier | null | undefined,
  trackingNumber: string | null | undefined
) {
  return Boolean(carrier && normalizeTrackingNumber(trackingNumber));
}

export function resolveFulfillmentStatusFromShipment(
  carrier: ShippingCarrier | null | undefined,
  trackingNumber: string | null | undefined
): FulfillmentStatus {
  return hasCompleteShipment(carrier, trackingNumber) ? "SHIPPED" : "UNFULFILLED";
}

export function resolveOrderStatusFromShipment(
  currentStatus: OrderStatus,
  carrier: ShippingCarrier | null | undefined,
  trackingNumber: string | null | undefined
): OrderStatus {
  if (currentStatus === "CANCELLED" || currentStatus === "REFUNDED" || currentStatus === "PENDING") {
    return currentStatus;
  }

  return hasCompleteShipment(carrier, trackingNumber) ? "FULFILLED" : "PAID";
}

export function formatShippingCarrierLabel(carrier: ShippingCarrier | null | undefined) {
  return carrier ? shippingCarrierLabels.get(carrier) ?? carrier : null;
}

export function formatShipmentSummary(
  carrier: ShippingCarrier | null | undefined,
  trackingNumber: string | null | undefined
) {
  const label = formatShippingCarrierLabel(carrier);
  const trackingNumbers = formatTrackingNumbers(trackingNumber);

  return label && trackingNumbers ? `${label} ${trackingNumbers}` : null;
}
