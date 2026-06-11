import type { FulfillmentStatus, OrderStatus, ShippingCarrier } from "@/lib/types";

export type ShipmentLike = {
  shippingCarrier: ShippingCarrier | null | undefined;
  trackingNumber: string | null | undefined;
  sortOrder?: number | null;
};

export type ShipmentInputLike = {
  shippingCarrier?: ShippingCarrier | string | null;
  trackingNumber?: string | null;
  sortOrder?: number | null;
};

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

export function normalizeTrackingNumber(value: string | null | undefined): string | null {
  const trackingNumbers = parseTrackingNumbers(value);
  return trackingNumbers.length > 0 ? trackingNumbers.join("\n") : null;
}

export function normalizeShipmentTrackingNumber(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function parseTrackingNumbers(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatTrackingNumbers(value: string | null | undefined): string {
  return parseTrackingNumbers(value).join(", ");
}

export function normalizeShipmentItems(shipments: ShipmentInputLike[] | null | undefined): Array<{
  shippingCarrier: ShippingCarrier | null;
  trackingNumber: string | null;
  sortOrder: number;
}> {
  return (shipments ?? [])
    .map((shipment, index) => ({
      shippingCarrier: normalizeShippingCarrier(shipment.shippingCarrier),
      trackingNumber: normalizeShipmentTrackingNumber(shipment.trackingNumber),
      sortOrder: index
    }))
    .filter((shipment) => shipment.shippingCarrier || shipment.trackingNumber);
}

export function deriveShipmentsFromLegacy(
  carrier: ShippingCarrier | string | null | undefined,
  trackingNumber: string | null | undefined
): Array<{ shippingCarrier: ShippingCarrier; trackingNumber: string; sortOrder: number }> {
  const shippingCarrier = normalizeShippingCarrier(carrier);

  if (!shippingCarrier) {
    return [];
  }

  return parseTrackingNumbers(trackingNumber).map((item, index) => ({
    shippingCarrier,
    trackingNumber: item,
    sortOrder: index
  }));
}

export function getCompleteShipmentItems(
  shipments: ShipmentLike[] | null | undefined
): Array<{ shippingCarrier: ShippingCarrier; trackingNumber: string; sortOrder: number }> {
  return (shipments ?? [])
    .map((shipment, index) => ({
      shippingCarrier: normalizeShippingCarrier(shipment.shippingCarrier),
      trackingNumber: normalizeShipmentTrackingNumber(shipment.trackingNumber),
      sortOrder: shipment.sortOrder ?? index
    }))
    .filter(
      (shipment): shipment is { shippingCarrier: ShippingCarrier; trackingNumber: string; sortOrder: number } =>
        Boolean(shipment.shippingCarrier && shipment.trackingNumber)
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function hasCompleteShipmentItems(shipments: ShipmentLike[] | null | undefined): boolean {
  return getCompleteShipmentItems(shipments).length > 0;
}

export function buildLegacyTrackingNumber(shipments: ShipmentLike[] | null | undefined): string | null {
  const trackingNumbers = getCompleteShipmentItems(shipments).map((shipment) => shipment.trackingNumber);
  return trackingNumbers.length > 0 ? trackingNumbers.join("\n") : null;
}

export function getPrimaryShipmentCarrier(shipments: ShipmentLike[] | null | undefined): ShippingCarrier | null {
  return getCompleteShipmentItems(shipments)[0]?.shippingCarrier ?? null;
}

export function getShipmentComparisonKey(shipments: ShipmentLike[] | null | undefined): string {
  return getCompleteShipmentItems(shipments)
    .map((shipment) => `${shipment.shippingCarrier}:${shipment.trackingNumber}`)
    .join("|");
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

export function resolveFulfillmentStatusFromShipments(
  shipments: ShipmentLike[] | null | undefined
): FulfillmentStatus {
  return hasCompleteShipmentItems(shipments) ? "SHIPPED" : "UNFULFILLED";
}

export function resolveOrderStatusFromShipments(
  currentStatus: OrderStatus,
  shipments: ShipmentLike[] | null | undefined
): OrderStatus {
  if (currentStatus === "CANCELLED" || currentStatus === "REFUNDED" || currentStatus === "PENDING") {
    return currentStatus;
  }

  return hasCompleteShipmentItems(shipments) ? "FULFILLED" : "PAID";
}

export function formatShippingCarrierLabel(carrier: ShippingCarrier | null | undefined): string | null {
  return carrier ? shippingCarrierLabels.get(carrier) ?? carrier : null;
}

export function formatShipmentSummary(
  carrier: ShippingCarrier | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  const label = formatShippingCarrierLabel(carrier);
  const trackingNumbers = formatTrackingNumbers(trackingNumber);

  return label && trackingNumbers ? `${label} ${trackingNumbers}` : null;
}

export function formatShipmentLine(shipment: ShipmentLike): string | null {
  const label = formatShippingCarrierLabel(shipment.shippingCarrier);
  const trackingNumber = normalizeShipmentTrackingNumber(shipment.trackingNumber);

  return label && trackingNumber ? `${label} ${trackingNumber}` : null;
}

export function formatShipmentListSummary(shipments: ShipmentLike[] | null | undefined): string | null {
  const lines = getCompleteShipmentItems(shipments)
    .map(formatShipmentLine)
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("; ") : null;
}
