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

export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
