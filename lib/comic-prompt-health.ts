import type { ParsedComicPromptOutput } from "@/lib/comic-prompt-output";

const REQUIRED_PAGE_COUNT = 10;
const MAX_REFERENCE_IMAGES_PER_PAGE = 16;

export type ComicPromptHealthSeverity = "issue" | "warning";

export type ComicPromptHealthFinding = {
  severity: ComicPromptHealthSeverity;
  message: string;
};

export type ComicPromptPageHealth = {
  pageNumber: number;
  ready: boolean;
  issueCount: number;
  warningCount: number;
  dialogueLineCount: number;
  uploadImageCount: number;
  hasLetteringGuide: boolean;
  findings: ComicPromptHealthFinding[];
};

export type ComicPromptHealthSummary = {
  totalPages: number;
  readyPages: number;
  issueCount: number;
  warningCount: number;
  pages: ComicPromptPageHealth[];
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getUniqueUploadNames(page: ParsedComicPromptOutput["pages"][number]) {
  return Array.from(
    new Set(page.requiredUploads.flatMap((upload) => upload.uploadImageNames).filter(Boolean))
  );
}

function promptIncludesLine(promptText: string, lineText: string) {
  const normalizedPrompt = normalizeText(promptText);
  const normalizedLine = normalizeText(lineText);

  return normalizedLine.length > 0 && normalizedPrompt.includes(normalizedLine);
}

function hasLetteringGuide(promptText: string) {
  const normalized = normalizeText(promptText);
  return (
    normalized.includes("lettering") ||
    normalized.includes("font") ||
    normalized.includes("speech balloon") ||
    normalized.includes("caption box")
  );
}

function addFinding(
  findings: ComicPromptHealthFinding[],
  severity: ComicPromptHealthSeverity,
  message: string
) {
  findings.push({ severity, message });
}

export function getComicPromptHealthSummary(
  promptOutput: ParsedComicPromptOutput | null
): ComicPromptHealthSummary {
  if (!promptOutput) {
    return {
      totalPages: 0,
      readyPages: 0,
      issueCount: 1,
      warningCount: 0,
      pages: [
        {
          pageNumber: 0,
          ready: false,
          issueCount: 1,
          warningCount: 0,
          dialogueLineCount: 0,
          uploadImageCount: 0,
          hasLetteringGuide: false,
          findings: [
            {
              severity: "issue",
              message: "Generate a 10-page prompt package before creating images."
            }
          ]
        }
      ]
    };
  }

  const pages = promptOutput.pages.map((page): ComicPromptPageHealth => {
    const findings: ComicPromptHealthFinding[] = [];
    const uploadNames = getUniqueUploadNames(page);
    const dialogueLines = page.panels.flatMap((panel) => panel.dialogueLines || []);
    const pagePromptText = [
      page.pagePurpose,
      page.promptPackCopyText,
      page.referenceNotesCopyText,
      page.panels.map((panel) => [panel.storyBeat, panel.promptText || ""].join("\n")).join("\n")
    ].join("\n\n");
    const pageHasLetteringGuide = hasLetteringGuide(pagePromptText);

    if (!page.promptPackCopyText.trim()) {
      addFinding(findings, "issue", "Image prompt text is missing.");
    }

    if (page.panelCount !== page.panels.length) {
      addFinding(findings, "issue", "Panel count does not match listed panels.");
    }

    if (![2, 3].includes(page.panelCount)) {
      addFinding(findings, "warning", "Panel count is outside the 2-3 panel production rhythm.");
    }

    if (!pageHasLetteringGuide) {
      addFinding(findings, "issue", "Lettering/font direction is missing from this page prompt.");
    }

    if (uploadNames.length > MAX_REFERENCE_IMAGES_PER_PAGE) {
      addFinding(
        findings,
        "warning",
        `Reference upload count is ${uploadNames.length}; keep the image input set focused.`
      );
    }

    page.requiredUploads.forEach((upload) => {
      if (upload.uploadImageNames.length === 0 || upload.relativePaths.length === 0) {
        addFinding(
          findings,
          "warning",
          `${upload.label || upload.slug} has incomplete reference file metadata.`
        );
      }
    });

    page.panels.forEach((panel) => {
      if (!panel.promptText?.trim()) {
        addFinding(findings, "warning", `Panel ${panel.panelNumber} is missing panel promptText.`);
      }

      if (!panel.dialogueLines?.length) {
        addFinding(findings, "issue", `Panel ${panel.panelNumber} has no dialogueLines.`);
        return;
      }

      panel.dialogueLines.forEach((line, index) => {
        if (!line.speaker.trim() || !line.text.trim()) {
          addFinding(
            findings,
            "issue",
            `Panel ${panel.panelNumber} dialogue ${index + 1} is missing speaker or text.`
          );
          return;
        }

        if (!promptIncludesLine(page.promptPackCopyText, line.text)) {
          addFinding(
            findings,
            "issue",
            `Panel ${panel.panelNumber} dialogue is not written into the image prompt.`
          );
        }
      });
    });

    const issueCount = findings.filter((finding) => finding.severity === "issue").length;
    const warningCount = findings.length - issueCount;

    return {
      pageNumber: page.pageNumber,
      ready: issueCount === 0,
      issueCount,
      warningCount,
      dialogueLineCount: dialogueLines.length,
      uploadImageCount: uploadNames.length,
      hasLetteringGuide: pageHasLetteringGuide,
      findings
    };
  });

  const pageCountFinding: ComicPromptHealthFinding | null =
    promptOutput.pages.length === REQUIRED_PAGE_COUNT
      ? null
      : {
          severity: "issue",
          message: `Prompt package has ${promptOutput.pages.length} pages; expected ${REQUIRED_PAGE_COUNT}.`
        };

  const pageCountIssues = pageCountFinding?.severity === "issue" ? 1 : 0;
  const pageCountWarnings = pageCountFinding?.severity === "warning" ? 1 : 0;
  const issueCount =
    pageCountIssues +
    pages.reduce((sum, page) => sum + page.issueCount, 0);
  const warningCount =
    pageCountWarnings +
    pages.reduce((sum, page) => sum + page.warningCount, 0);

  return {
    totalPages: promptOutput.pages.length,
    readyPages: pages.filter((page) => page.ready).length,
    issueCount,
    warningCount,
    pages: pageCountFinding
      ? [
          {
            pageNumber: 0,
            ready: false,
            issueCount: pageCountIssues,
            warningCount: pageCountWarnings,
            dialogueLineCount: 0,
            uploadImageCount: 0,
            hasLetteringGuide: false,
            findings: [pageCountFinding]
          },
          ...pages
        ]
      : pages
  };
}
