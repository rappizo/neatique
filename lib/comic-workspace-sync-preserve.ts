const PLACEHOLDER_TEXTS = new Set([
  "Add the full multi-season story outline here.",
  "Add the season outline here.",
  "Add the chapter outline here.",
  "Add the episode outline here.",
  "Add the season summary here.",
  "Add the chapter summary here.",
  "Add the episode promise here."
]);

function normalizeSyncText(value?: string | null) {
  return (value || "").replace(/\r\n/g, "\n").trim();
}

function hasChineseText(value: string) {
  return /[\u4e00-\u9fff]/.test(value);
}

function hasUsableText(value: string) {
  return Boolean(value && !PLACEHOLDER_TEXTS.has(value));
}

function toTimestamp(value?: Date | string | number | null) {
  if (!value) {
    return null;
  }

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export type ComicWorkspaceTextSyncSource = "existing" | "workspace" | "fallback";

export function selectComicWorkspaceTextForSyncResult(input: {
  existingText?: string | null;
  workspaceText?: string | null;
  fallbackText: string;
  existingUpdatedAt?: Date | string | number | null;
  workspaceUpdatedAt?: Date | string | number | null;
}): {
  text: string;
  source: ComicWorkspaceTextSyncSource;
} {
  const existingText = normalizeSyncText(input.existingText);
  const workspaceText = normalizeSyncText(input.workspaceText);
  const fallbackText = normalizeSyncText(input.fallbackText);
  const existingUpdatedAt = toTimestamp(input.existingUpdatedAt);
  const workspaceUpdatedAt = toTimestamp(input.workspaceUpdatedAt);

  if (!hasUsableText(workspaceText)) {
    return hasUsableText(existingText)
      ? { text: existingText, source: "existing" }
      : { text: fallbackText, source: "fallback" };
  }

  if (
    hasUsableText(existingText) &&
    existingUpdatedAt !== null &&
    workspaceUpdatedAt !== null &&
    existingUpdatedAt > workspaceUpdatedAt
  ) {
    return { text: existingText, source: "existing" };
  }

  if (hasChineseText(existingText) && !hasChineseText(workspaceText)) {
    return { text: existingText, source: "existing" };
  }

  return { text: workspaceText, source: "workspace" };
}

export function selectComicWorkspaceTextForSync(input: {
  existingText?: string | null;
  workspaceText?: string | null;
  fallbackText: string;
  existingUpdatedAt?: Date | string | number | null;
  workspaceUpdatedAt?: Date | string | number | null;
}) {
  return selectComicWorkspaceTextForSyncResult(input).text;
}
