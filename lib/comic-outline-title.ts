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

export function extractEpisodeTitleFromChapterOutline(input: {
  chapterOutline?: string | null;
  episodeNumber: number;
}) {
  const outline = input.chapterOutline || "";

  if (!outline.trim()) {
    return null;
  }

  const episodePattern = new RegExp(
    String.raw`^Episode\s*0?${input.episodeNumber}\s*[-:\uFF1A\u2013\u2014]\s*(.+?)\s*$`,
    "i"
  );

  for (const rawLine of outline.split(/\r?\n/)) {
    const line = rawLine
      .trim()
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/^\*\*/, "")
      .replace(/\*\*$/, "")
      .trim();
    const match = line.match(episodePattern);

    if (!match?.[1]) {
      continue;
    }

    const title = match[1]
      .replace(/\*\*/g, "")
      .split(/[:\uFF1A]/)[0]
      .trim();

    if (title) {
      return title;
    }
  }

  return null;
}

export function resolveGeneratedEpisodeTitle(input: {
  generatedTitle?: string | null;
  parentOutlineTitle?: string | null;
  fallbackTitle: string;
  numberLabel: string;
}) {
  const fallbackTitle = input.fallbackTitle.trim();
  const parentOutlineTitle = normalizeGeneratedOutlineTitle({
    generatedTitle: input.parentOutlineTitle,
    fallbackTitle: "",
    numberLabel: input.numberLabel
  }).trim();
  const generatedTitle = normalizeGeneratedOutlineTitle({
    generatedTitle: input.generatedTitle,
    fallbackTitle: "",
    numberLabel: input.numberLabel
  }).trim();

  if (parentOutlineTitle && (!generatedTitle || generatedTitle === fallbackTitle)) {
    return parentOutlineTitle;
  }

  return generatedTitle || parentOutlineTitle || fallbackTitle;
}
