export type StoredPromptPanel = {
  panelNumber: number;
  panelTitle: string;
  storyBeat: string;
  promptText?: string;
  dialogueLines?: StoredPromptDialogueLine[];
};

export type StoredPromptDialogueLine = {
  speaker: string;
  text: string;
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
  referenceNotesCopyText?: string;
  requiredUploads?: StoredPromptUpload[];
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

type LegacyPanelPrompt = {
  panelNumber: number;
  panelTitle: string;
  promptText: string;
  uploadChecklist?: string[];
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

function normalizeStoredDialogueLines(value: unknown): StoredPromptDialogueLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((line) => ({
      speaker:
        line && typeof line === "object" && typeof (line as StoredPromptDialogueLine).speaker === "string"
          ? (line as StoredPromptDialogueLine).speaker.trim()
          : "",
      text:
        line && typeof line === "object" && typeof (line as StoredPromptDialogueLine).text === "string"
          ? (line as StoredPromptDialogueLine).text.trim()
          : ""
    }))
    .filter((line) => line.speaker && line.text);
}

function normalizeStoredPromptPanel(value: unknown): StoredPromptPanel | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const panel = value as Partial<StoredPromptPanel>;
  const panelNumber = Number(panel.panelNumber);
  const panelTitle = typeof panel.panelTitle === "string" ? panel.panelTitle.trim() : "";
  const storyBeat = typeof panel.storyBeat === "string" ? panel.storyBeat.trim() : "";

  if (!Number.isFinite(panelNumber) || panelNumber < 1 || !panelTitle || !storyBeat) {
    return null;
  }

  const promptText = typeof panel.promptText === "string" ? panel.promptText.trim() : "";

  return {
    panelNumber,
    panelTitle,
    storyBeat,
    ...(promptText ? { promptText } : {}),
    dialogueLines: normalizeStoredDialogueLines(panel.dialogueLines)
  };
}

function isStoredReferencePage(value: unknown): value is StoredReferencePage {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof (value as StoredReferencePage).pageNumber === "number" &&
    typeof (value as StoredReferencePage).panelCount === "number" &&
    typeof (value as StoredReferencePage).referenceNotesCopyText === "string" &&
    Array.isArray((value as StoredReferencePage).requiredUploads);
}

function isLegacyPanelPrompt(value: unknown): value is LegacyPanelPrompt {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof (value as LegacyPanelPrompt).panelNumber === "number" &&
    typeof (value as LegacyPanelPrompt).panelTitle === "string" &&
    typeof (value as LegacyPanelPrompt).promptText === "string";
}

function getStoredPromptPages(promptPackValue: string) {
  const parsed = safeParseJson(promptPackValue);

  if (Array.isArray(parsed)) {
    return parsed.filter(isStoredPromptPage);
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.pages)) {
    return parsed.pages.filter(isStoredPromptPage);
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.promptPages)) {
    return parsed.promptPages.filter(isStoredPromptPage);
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    parsed.promptPack &&
    typeof parsed.promptPack === "object" &&
    Array.isArray((parsed.promptPack as { pages?: unknown[] }).pages)
  ) {
    return (parsed.promptPack as { pages: unknown[] }).pages.filter(isStoredPromptPage);
  }

  return [];
}

function getLegacyPanelPrompts(promptPackValue: string) {
  const parsed = safeParseJson(promptPackValue);

  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Array.isArray(parsed.panelPrompts)
  ) {
    return parsed.panelPrompts.filter(isLegacyPanelPrompt);
  }

  return [];
}

function getStoredReferencePages(requiredReferencesValue: string) {
  const parsed = safeParseJson(requiredReferencesValue);

  if (Array.isArray(parsed)) {
    return parsed.filter(isStoredReferencePage);
  }

  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  if (Array.isArray(parsed.pages)) {
    return parsed.pages.filter(isStoredReferencePage);
  }

  if (Array.isArray(parsed.referencePages)) {
    return parsed.referencePages.filter(isStoredReferencePage);
  }

  if (
    parsed.referenceChecklist &&
    typeof parsed.referenceChecklist === "object" &&
    Array.isArray((parsed.referenceChecklist as { pages?: unknown[] }).pages)
  ) {
    return (parsed.referenceChecklist as { pages: unknown[] }).pages.filter(isStoredReferencePage);
  }

  return [];
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

  if (typeof parsed.globalGptImage2Notes === "string") {
    return parsed.globalGptImage2Notes;
  }

  return typeof parsed.gptImage2Instructions === "string" ? parsed.gptImage2Instructions : null;
}

function getFileNameFromPath(pathValue: string) {
  const normalized = pathValue.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() || pathValue;
}

function getSlugFromPath(pathValue: string) {
  const normalized = pathValue.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const refsIndex = parts.lastIndexOf("refs");

  if (refsIndex > 0) {
    return parts[refsIndex - 1] || "reference";
  }

  const sceneRefsIndex = parts.lastIndexOf("scene-refs");
  if (sceneRefsIndex >= 0) {
    return getFileNameFromPath(pathValue).replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  }

  return getFileNameFromPath(pathValue).replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

function parseLegacyUploadLine(line: string, pageNumber: number, index: number): StoredPromptUpload {
  const pathMatch = line.match(/(?:character ref|scene ref):\s*([^(]+?)(?:\s*\(([^)]+)\))?$/i);
  const relativePath = pathMatch?.[1]?.trim() || line.trim();
  const displayName = pathMatch?.[2]?.trim() || getFileNameFromPath(relativePath);
  const isCharacter = /character ref/i.test(line);
  const isScene = /scene ref/i.test(line);

  return {
    bucket: isCharacter ? "CHARACTER" : isScene ? "CHAPTER_SCENE" : "SCENE",
    label: displayName,
    slug: `${getSlugFromPath(relativePath)}-${pageNumber}-${index}`,
    whyThisMatters: "Required by the legacy panel prompt converted into this page kit.",
    contentSummary: line.trim(),
    uploadImageNames: [displayName],
    relativePaths: [relativePath]
  };
}

function getUniqueLegacyUploads(panels: LegacyPanelPrompt[], pageNumber: number) {
  const uploadMap = new Map<string, StoredPromptUpload>();

  panels.forEach((panel) => {
    (panel.uploadChecklist || []).forEach((line, index) => {
      const upload = parseLegacyUploadLine(line, pageNumber, index);
      const key = `${upload.bucket}-${upload.relativePaths.join("|")}-${upload.uploadImageNames.join("|")}`;

      if (!uploadMap.has(key)) {
        uploadMap.set(key, upload);
      }
    });
  });

  return Array.from(uploadMap.values());
}

function chunkLegacyPanels(panels: LegacyPanelPrompt[]) {
  const chunks: LegacyPanelPrompt[][] = [];

  for (let index = 0; index < panels.length; index += 3) {
    chunks.push(panels.slice(index, index + 3));
  }

  return chunks;
}

function buildLegacyPromptText(pageNumber: number, panels: LegacyPanelPrompt[]) {
  return [
    `Page ${String(pageNumber).padStart(2, "0")} converted from legacy panel prompts.`,
    "Use these panel prompts as the page-level direction. Regenerate this episode from Outline Studio or Publish Center when you want the newer 10-page workflow.",
    ...panels.map((panel) =>
      [`Panel ${panel.panelNumber}: ${panel.panelTitle}`, panel.promptText].join("\n")
    )
  ].join("\n\n");
}

function buildLegacyReferenceNotes(
  pageNumber: number,
  panels: LegacyPanelPrompt[],
  globalGptImage2Notes: string | null
) {
  const uploadLines = panels.flatMap((panel) => panel.uploadChecklist || []);

  return [
    `Page ${String(pageNumber).padStart(2, "0")} upload checklist converted from legacy panel output.`,
    globalGptImage2Notes ? `Global gpt-image-2 notes:\n${globalGptImage2Notes}` : null,
    uploadLines.length > 0 ? `Upload these files before generating:\n${uploadLines.join("\n")}` : null
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseLegacyComicPromptOutput(
  promptPackValue: string,
  requiredReferencesValue: string
): ParsedComicPromptOutput | null {
  const legacyPanels = getLegacyPanelPrompts(promptPackValue);

  if (legacyPanels.length === 0) {
    return null;
  }

  const promptMeta = getStoredPromptMeta(promptPackValue);
  const globalGptImage2Notes = getGlobalReferenceNotes(requiredReferencesValue);

  return {
    ...promptMeta,
    globalGptImage2Notes,
    pages: chunkLegacyPanels(legacyPanels).map((panels, index) => {
      const pageNumber = index + 1;
      const pagePurpose = panels.map((panel) => panel.panelTitle).join(" / ");

      return {
        pageNumber,
        panelCount: panels.length,
        pagePurpose: pagePurpose || `Legacy page ${pageNumber}`,
        promptPackCopyText: buildLegacyPromptText(pageNumber, panels),
        referenceNotesCopyText: buildLegacyReferenceNotes(pageNumber, panels, globalGptImage2Notes),
        panels: panels.map((panel) => ({
          panelNumber: panel.panelNumber,
          panelTitle: panel.panelTitle,
          storyBeat: panel.promptText,
          promptText: panel.promptText,
          dialogueLines: []
        })),
        requiredUploads: getUniqueLegacyUploads(panels, pageNumber)
      };
    })
  };
}

export function parseComicPromptOutput(
  promptPackValue: string,
  requiredReferencesValue: string
): ParsedComicPromptOutput | null {
  const promptPages = getStoredPromptPages(promptPackValue);

  if (promptPages.length === 0) {
    return parseLegacyComicPromptOutput(promptPackValue, requiredReferencesValue);
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
        const requiredUploads = Array.isArray(referencePage?.requiredUploads)
          ? referencePage.requiredUploads
          : Array.isArray(page.requiredUploads)
            ? page.requiredUploads
            : [];

        return {
          pageNumber: page.pageNumber,
          panelCount: page.panelCount,
          pagePurpose: page.pagePurpose,
          promptPackCopyText: page.promptPackCopyText,
          referenceNotesCopyText:
            referencePage?.referenceNotesCopyText || page.referenceNotesCopyText || "",
          panels: page.panels
            .map(normalizeStoredPromptPanel)
            .filter(Boolean) as StoredPromptPanel[],
          requiredUploads
        };
      })
  };
}
