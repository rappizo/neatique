export const LOS_ANGELES_TIME_ZONE = "America/Los_Angeles";

export function formatCurrency(amountInCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountInCents / 100);
}

export function formatCurrencyInput(amountInCents: number | null | undefined) {
  if (typeof amountInCents !== "number") {
    return "";
  }

  return (amountInCents / 100).toFixed(2);
}

export function getSavingsCents(compareAtPriceCents: number | null | undefined, priceCents: number) {
  if (typeof compareAtPriceCents !== "number" || compareAtPriceCents <= priceCents) {
    return 0;
  }

  return compareAtPriceCents - priceCents;
}

export function formatDate(date: Date | null | undefined, timeZone?: string) {
  if (!date) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(timeZone ? { timeZone } : {})
  }).format(new Date(date));
}

export function formatTime(
  date: Date | null | undefined,
  timeZone?: string,
  includeZone = false
) {
  if (!date) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
    ...(includeZone ? { timeZoneName: "short" as const } : {})
  }).format(new Date(date));
}

export function getDateKeyInTimeZone(
  date: Date | null | undefined,
  timeZone = LOS_ANGELES_TIME_ZONE
) {
  if (!date) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}
