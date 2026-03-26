export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function toPlainString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function toInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseInt(toPlainString(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toPriceCents(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseFloat(toPlainString(value));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : fallback;
}

export function normalizeMultilineValue(value: FormDataEntryValue | null) {
  return toPlainString(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

export function toBool(value: FormDataEntryValue | null) {
  const stringValue = toPlainString(value);
  return stringValue === "on" || stringValue === "true";
}
