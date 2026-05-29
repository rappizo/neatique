import type { FulfillmentStatus, OrderStatus, ShippingCarrier } from "@/lib/types";

export const shippingCarrierOptions: Array<{ value: ShippingCarrier; label: string }> = [
  { value: "USPS", label: "USPS" },
  { value: "UPS_GROUND", label: "UPS Ground" },
  { value: "DHL", label: "DHL" },
  { value: "AMAZON_TBA", label: "Amazon TBA" }
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
  const normalized = value?.trim();
  return normalized ? normalized : null;
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
