function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeGeneratedOutlineTitle(input: {
  generatedTitle?: string | null;
  fallbackTitle: string;
  numberLabel?: string | null;
}) {
  const generatedTitle = (input.generatedTitle || "").trim();
  const fallbackTitle = input.fallbackTitle.trim();
  const numberLabel = (input.numberLabel || "").trim();
  const withoutNumberLabel =
    numberLabel && generatedTitle
      ? generatedTitle
          .replace(new RegExp(`^${escapeRegExp(numberLabel)}\\s*[-:]\\s*`, "i"), "")
          .trim()
      : generatedTitle;

  return withoutNumberLabel || fallbackTitle;
}
