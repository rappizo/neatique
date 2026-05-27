import type { FulfillmentStatus, ShippingCarrier } from "@/lib/types";

export const shippingCarrierOptions: Array<{ value: ShippingCarrier; label: string }> = [
  { value: "USPS", label: "USPS" },
  { value: "UPS_GROUND", label: "UPS Ground" },
  { value: "DHL", label: "DHL" }
];

const shippingCarrierLabels = new Map(
  shippingCarrierOptions.map((option) => [option.value, option.label])
);

export function normalizeShippingCarrier(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "UPS GROUND") {
    return "UPS_GROUND";
  }

  if (normalized === "USPS" || normalized === "UPS_GROUND" || normalized === "DHL") {
    return normalized;
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

export function formatShippingCarrierLabel(carrier: ShippingCarrier | null | undefined) {
  return carrier ? shippingCarrierLabels.get(carrier) ?? carrier : null;
}
