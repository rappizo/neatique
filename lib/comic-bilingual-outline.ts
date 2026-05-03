export type ComicBilingualText = {
  zh: string;
  en: string;
};

const BILINGUAL_HEADING_PATTERN = "(?:中文|Chinese|英文|English)";

export function hasComicChineseText(value?: string | null) {
  return /[\u4e00-\u9fff]/.test(value || "");
}

function cleanSection(value?: string | null) {
  return (value || "").trim();
}

function extractMarkdownSection(value: string, labels: string[]) {
  const labelPattern = labels.join("|");
  const pattern = new RegExp(
    `(?:^|\\n)#{1,6}\\s*(?:${labelPattern})\\s*\\n+([\\s\\S]*?)(?=\\n#{1,6}\\s*${BILINGUAL_HEADING_PATTERN}\\s*\\n|$)`,
    "i"
  );
  const match = value.match(pattern);

  return cleanSection(match?.[1]);
}

function extractInlineLabel(value: string, labels: string[]) {
  const labelPattern = labels.join("|");
  const pattern = new RegExp(
    `(?:^|\\n)(?:${labelPattern})\\s*[：:]\\s*([\\s\\S]*?)(?=\\n(?:中文|Chinese|英文|English)\\s*[：:]|$)`,
    "i"
  );
  const match = value.match(pattern);

  return cleanSection(match?.[1]);
}

export function parseComicBilingualText(value?: string | null): ComicBilingualText {
  const normalized = cleanSection(value);

  if (!normalized) {
    return { zh: "", en: "" };
  }

  const markdownZh = extractMarkdownSection(normalized, ["中文", "Chinese"]);
  const markdownEn = extractMarkdownSection(normalized, ["英文", "English"]);

  if (markdownZh || markdownEn) {
    return {
      zh: markdownZh,
      en: markdownEn
    };
  }

  const inlineZh = extractInlineLabel(normalized, ["中文", "Chinese"]);
  const inlineEn = extractInlineLabel(normalized, ["英文", "English"]);

  if (inlineZh || inlineEn) {
    return {
      zh: inlineZh,
      en: inlineEn
    };
  }

  return hasComicChineseText(normalized)
    ? { zh: normalized, en: "" }
    : { zh: "", en: normalized };
}

export function formatComicBilingualOutline({
  zh,
  en
}: {
  zh?: string | null;
  en?: string | null;
}) {
  const zhText = cleanSection(zh);
  const enText = cleanSection(en);

  if (zhText && enText) {
    return `## 中文\n\n${zhText}\n\n## English\n\n${enText}`;
  }

  return zhText || enText;
}

export function formatComicBilingualSummary({
  zh,
  en
}: {
  zh?: string | null;
  en?: string | null;
}) {
  const zhText = cleanSection(zh);
  const enText = cleanSection(en);

  if (zhText && enText) {
    return `中文：${zhText}\nEnglish: ${enText}`;
  }

  return zhText || enText;
}
