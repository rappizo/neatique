export type StoredPromptPanel = {
  panelNumber: number;
  panelTitle: string;
  storyBeat: string;
};

export type StoredPromptUpload = {
  bucket: "CHARACTER" | "SCENE" | "CHAPTER_SCENE";
  label: string;
  slug: string;
  whyThisMatters: string;
  contentSummary: string;
  uploadImageNames: string[];
  relativePaths: string[];
};

export type StoredPromptPage = {
  pageNumber: number;
  panelCount: number;
  pagePurpose: string;
  promptPackCopyText: string;
  panels: StoredPromptPanel[];
};

export type StoredReferencePage = {
  pageNumber: number;
  panelCount: number;
  referenceNotesCopyText: string;
  requiredUploads: StoredPromptUpload[];
};

export type ParsedComicPromptOutput = {
  episodeLogline: string | null;
  episodeSynopsis: string | null;
  globalGptImage2Notes: string | null;
  pages: Array<{
    pageNumber: number;
    panelCount: number;
    pagePurpose: string;
    promptPackCopyText: string;
    referenceNotesCopyText: string;
    panels: StoredPromptPanel[];
    requiredUploads: StoredPromptUpload[];
  }>;
};

function safeParseJson(value: string) {
  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown> | Array<unknown>;
  } catch {
    return null;
  }
}

function isStoredPromptPage(value: unknown): value is StoredPromptPage {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof (value as StoredPromptPage).pageNumber === "number" &&
    typeof (value as StoredPromptPage).panelCount === "number" &&
    typeof (value as StoredPromptPage).pagePurpose === "string" &&
    typeof (value as StoredPromptPage).promptPackCopyText === "string" &&
    Array.isArray((value as StoredPromptPage).panels);
}

function isStoredReferencePage(value: unknown): value is StoredReferencePage {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof (value as StoredReferencePage).pageNumber === "number" &&
    typeof (value as StoredReferencePage).panelCount === "number" &&
    typeof (value as StoredReferencePage).referenceNotesCopyText === "string" &&
    Array.isArray((value as StoredReferencePage).requiredUploads);
}

function getStoredPromptPages(promptPackValue: string) {
  const parsed = safeParseJson(promptPackValue);

  if (Array.isArray(parsed)) {
    return parsed.filter(isStoredPromptPage);
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.pages)) {
    return parsed.pages.filter(isStoredPromptPage);
  }

  return [];
}

function getStoredReferencePages(requiredReferencesValue: string) {
  const parsed = safeParseJson(requiredReferencesValue);

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" || !Array.isArray(parsed.pages)) {
    return [];
  }

  return parsed.pages.filter(isStoredReferencePage);
}

function getStoredPromptMeta(promptPackValue: string) {
  const parsed = safeParseJson(promptPackValue);

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return {
      episodeLogline: null,
      episodeSynopsis: null
    };
  }

  return {
    episodeLogline: typeof parsed.episodeLogline === "string" ? parsed.episodeLogline : null,
    episodeSynopsis: typeof parsed.episodeSynopsis === "string" ? parsed.episodeSynopsis : null
  };
}

function getGlobalReferenceNotes(requiredReferencesValue: string) {
  const parsed = safeParseJson(requiredReferencesValue);

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return null;
  }

  return typeof parsed.globalGptImage2Notes === "string" ? parsed.globalGptImage2Notes : null;
}

export function parseComicPromptOutput(
  promptPackValue: string,
  requiredReferencesValue: string
): ParsedComicPromptOutput | null {
  const promptPages = getStoredPromptPages(promptPackValue);

  if (promptPages.length === 0) {
    return null;
  }

  const referencePages = getStoredReferencePages(requiredReferencesValue);
  const referencePageMap = new Map(referencePages.map((page) => [page.pageNumber, page]));
  const promptMeta = getStoredPromptMeta(promptPackValue);
  const globalGptImage2Notes = getGlobalReferenceNotes(requiredReferencesValue);

  return {
    ...promptMeta,
    globalGptImage2Notes,
    pages: promptPages
      .sort((left, right) => left.pageNumber - right.pageNumber)
      .map((page) => {
        const referencePage = referencePageMap.get(page.pageNumber);

        return {
          pageNumber: page.pageNumber,
          panelCount: page.panelCount,
          pagePurpose: page.pagePurpose,
          promptPackCopyText: page.promptPackCopyText,
          referenceNotesCopyText: referencePage?.referenceNotesCopyText || "",
          panels: page.panels,
          requiredUploads: Array.isArray(referencePage?.requiredUploads)
            ? referencePage.requiredUploads
            : []
        };
      })
  };
}
