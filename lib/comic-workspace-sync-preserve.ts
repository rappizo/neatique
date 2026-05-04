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

export function selectComicWorkspaceTextForSync(input: {
  existingText?: string | null;
  workspaceText?: string | null;
  fallbackText: string;
}) {
  const existingText = normalizeSyncText(input.existingText);
  const workspaceText = normalizeSyncText(input.workspaceText);
  const fallbackText = normalizeSyncText(input.fallbackText);

  if (!hasUsableText(workspaceText)) {
    return hasUsableText(existingText) ? existingText : fallbackText;
  }

  if (hasChineseText(existingText) && !hasChineseText(workspaceText)) {
    return existingText;
  }

  return workspaceText;
}
