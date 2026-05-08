import type { StoredPromptPage, StoredPromptUpload } from "@/lib/comic-prompt-output";

export const COMIC_CAST_CHEAT_SHEET_EXTRA_PAGE_KEY = "cast-cheat-sheet";

export type ComicExtraPromptPage = Omit<StoredPromptPage, "requiredUploads"> & {
  extraPageKey: string;
  title: string;
  anchorPageNumber: number;
  imagePageNumber?: number;
  requiredUploads: StoredPromptUpload[];
};

export type ComicExtraReferencePage = {
  extraPageKey: string;
  panelCount: number;
  referenceNotesCopyText: string;
  requiredUploads: StoredPromptUpload[];
};

function safeParseJson(value: string) {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isStoredPromptUpload(value: unknown): value is StoredPromptUpload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const upload = value as Partial<StoredPromptUpload>;
  return (
    typeof upload.bucket === "string" &&
    typeof upload.label === "string" &&
    typeof upload.slug === "string" &&
    Array.isArray(upload.uploadImageNames) &&
    Array.isArray(upload.relativePaths)
  );
}

function isComicExtraPromptPage(value: unknown): value is ComicExtraPromptPage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const page = value as Partial<ComicExtraPromptPage>;
  return (
    typeof page.extraPageKey === "string" &&
    Boolean(page.extraPageKey.trim()) &&
    typeof page.title === "string" &&
    Boolean(page.title.trim()) &&
    typeof page.anchorPageNumber === "number" &&
    typeof page.pageNumber === "number" &&
    typeof page.panelCount === "number" &&
    typeof page.pagePurpose === "string" &&
    typeof page.promptPackCopyText === "string" &&
    Array.isArray(page.panels)
  );
}

function isComicExtraReferencePage(value: unknown): value is ComicExtraReferencePage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const page = value as Partial<ComicExtraReferencePage>;
  return (
    typeof page.extraPageKey === "string" &&
    Boolean(page.extraPageKey.trim()) &&
    typeof page.panelCount === "number" &&
    typeof page.referenceNotesCopyText === "string" &&
    Array.isArray(page.requiredUploads)
  );
}

export function getComicExtraPromptPages(promptPackValue: string): ComicExtraPromptPage[] {
  const parsed = safeParseJson(promptPackValue);
  const extraPages = Array.isArray(parsed?.extraPages) ? parsed.extraPages : [];

  return extraPages
    .filter(isComicExtraPromptPage)
    .map((page) => ({
      ...page,
      extraPageKey: page.extraPageKey.trim(),
      title: page.title.trim(),
      requiredUploads: Array.isArray(page.requiredUploads)
        ? page.requiredUploads.filter(isStoredPromptUpload)
        : []
    }))
    .sort((left, right) => {
      if (left.anchorPageNumber !== right.anchorPageNumber) {
        return left.anchorPageNumber - right.anchorPageNumber;
      }

      return left.title.localeCompare(right.title);
    });
}

export function getComicExtraPromptPage(
  promptPackValue: string,
  extraPageKey: string
) {
  const normalizedKey = extraPageKey.trim();

  return (
    getComicExtraPromptPages(promptPackValue).find(
      (page) => page.extraPageKey === normalizedKey
    ) || null
  );
}

export function getComicExtraReferencePages(
  requiredReferencesValue: string
): ComicExtraReferencePage[] {
  const parsed = safeParseJson(requiredReferencesValue);
  const extraPages = Array.isArray(parsed?.extraPages) ? parsed.extraPages : [];

  return extraPages
    .filter(isComicExtraReferencePage)
    .map((page) => ({
      ...page,
      extraPageKey: page.extraPageKey.trim(),
      requiredUploads: page.requiredUploads.filter(isStoredPromptUpload)
    }));
}

export function upsertComicExtraPromptPage(
  promptPackValue: string,
  extraPage: ComicExtraPromptPage
) {
  const parsed = safeParseJson(promptPackValue) || {};
  const extraPages = getComicExtraPromptPages(promptPackValue);
  const nextExtraPages = [
    ...extraPages.filter((page) => page.extraPageKey !== extraPage.extraPageKey),
    extraPage
  ].sort((left, right) => {
    if (left.anchorPageNumber !== right.anchorPageNumber) {
      return left.anchorPageNumber - right.anchorPageNumber;
    }

    return left.title.localeCompare(right.title);
  });

  return JSON.stringify(
    {
      ...parsed,
      extraPages: nextExtraPages
    },
    null,
    2
  );
}

export function upsertComicExtraReferencePage(
  requiredReferencesValue: string,
  extraPage: ComicExtraPromptPage
) {
  const parsed = safeParseJson(requiredReferencesValue) || {};
  const extraPages = getComicExtraReferencePages(requiredReferencesValue);
  const nextExtraPages = [
    ...extraPages.filter((page) => page.extraPageKey !== extraPage.extraPageKey),
    {
      extraPageKey: extraPage.extraPageKey,
      panelCount: extraPage.panelCount,
      referenceNotesCopyText: extraPage.referenceNotesCopyText || "",
      requiredUploads: extraPage.requiredUploads || []
    }
  ].sort((left, right) => left.extraPageKey.localeCompare(right.extraPageKey));

  return JSON.stringify(
    {
      ...parsed,
      extraPages: nextExtraPages
    },
    null,
    2
  );
}
