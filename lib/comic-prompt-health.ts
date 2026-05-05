import type { ParsedComicPromptOutput } from "@/lib/comic-prompt-output";

const REQUIRED_PAGE_COUNT = 10;
const MAX_REFERENCE_IMAGES_PER_PAGE = 16;
const STORY_CONTINUITY_OBJECT_KEYWORDS = [
  "handbook",
  "map",
  "stamp",
  "badge",
  "notebook",
  "folder",
  "clipboard",
  "key"
];
const CONTEXTUAL_CONTINUITY_OBJECT_KEYWORDS = [
  "bottle",
  "serum",
  "cream",
  "tray",
  "card",
  "poster",
  "shelf",
  "desk",
  "door"
];
const STORY_SIGNIFICANCE_KEYWORDS = [
  "important",
  "significant",
  "story",
  "plot",
  "clue",
  "evidence",
  "reveal",
  "mystery",
  "secret",
  "hidden",
  "old",
  "archive",
  "thesis",
  "founder",
  "canon",
  "continuity-critical"
];

export type ComicPromptHealthSeverity = "issue" | "warning";

export type ComicPromptHealthFinding = {
  severity: ComicPromptHealthSeverity;
  key: string;
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

export type ComicPromptHealthOptions = {
  neglectedFindingKeys?: string[];
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

function keywordPattern(keyword: string) {
  return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i");
}

function keywordMatches(keyword: string, text: string) {
  return keywordPattern(keyword).test(text);
}

function textHasStorySignificanceSignal(text: string) {
  return STORY_SIGNIFICANCE_KEYWORDS.some((keyword) => keywordMatches(keyword, text));
}

function getKeywordContext(text: string, keyword: string) {
  const normalized = normalizeText(text);
  const match = keywordPattern(keyword).exec(normalized);

  if (!match || typeof match.index !== "number") {
    return "";
  }

  return normalized.slice(Math.max(0, match.index - 120), match.index + 220);
}

function getPageContinuityText(page: ParsedComicPromptOutput["pages"][number]) {
  return [
    page.pagePurpose,
    page.promptPackCopyText,
    page.referenceNotesCopyText,
    page.panels
      .map((panel) =>
        [
          panel.panelTitle,
          panel.storyBeat,
          panel.promptText || "",
          panel.dialogueLines?.map((line) => `${line.speaker}: ${line.text}`).join("\n") || ""
        ].join("\n")
      )
      .join("\n\n")
  ].join("\n\n");
}

function getUploadContinuityText(page: ParsedComicPromptOutput["pages"][number]) {
  return page.requiredUploads
    .map((upload) =>
      [
        upload.label,
        upload.slug,
        upload.whyThisMatters,
        upload.contentSummary,
        upload.uploadImageNames.join(" "),
        upload.relativePaths.join(" ")
      ].join(" ")
    )
    .join("\n");
}

function getRecurringContinuityObjectKeywords(promptOutput: ParsedComicPromptOutput) {
  const pageHits = new Map<string, Set<number>>();

  promptOutput.pages.forEach((page) => {
    const pageText = getPageContinuityText(page);

    STORY_CONTINUITY_OBJECT_KEYWORDS.forEach((keyword) => {
      if (!keywordMatches(keyword, pageText)) {
        return;
      }

      const pages = pageHits.get(keyword) || new Set<number>();
      pages.add(page.pageNumber);
      pageHits.set(keyword, pages);
    });

    CONTEXTUAL_CONTINUITY_OBJECT_KEYWORDS.forEach((keyword) => {
      if (!keywordMatches(keyword, pageText)) {
        return;
      }

      const keywordContext = getKeywordContext(pageText, keyword);

      if (!textHasStorySignificanceSignal(keywordContext)) {
        return;
      }

      const pages = pageHits.get(keyword) || new Set<number>();
      pages.add(page.pageNumber);
      pageHits.set(keyword, pages);
    });
  });

  return new Map(
    Array.from(pageHits.entries()).filter(([, pages]) => pages.size >= 2)
  );
}

function pageHasContinuityReferenceForKeyword(
  page: ParsedComicPromptOutput["pages"][number],
  keyword: string
) {
  const uploadText = getUploadContinuityText(page);

  if (keywordPattern(keyword).test(uploadText)) {
    return true;
  }

  const normalizedPageText = normalizeText(getPageContinuityText(page));
  const keywordIndex = normalizedPageText.indexOf(keyword);

  if (keywordIndex < 0) {
    return true;
  }

  const nearby = normalizedPageText.slice(Math.max(0, keywordIndex - 80), keywordIndex + 160);

  return (
    nearby.includes("exact") ||
    nearby.includes("continuity") ||
    nearby.includes("locked") ||
    nearby.includes("approved") ||
    nearby.includes(`same ${keyword}`) ||
    nearby.includes(`${keyword} reference`) ||
    nearby.includes(`reference ${keyword}`) ||
    nearby.includes(`${keyword} design`) ||
    nearby.includes(`model ${keyword}`)
  );
}

function formatContinuityKeywordPages(pages: Set<number>) {
  return Array.from(pages)
    .sort((left, right) => left - right)
    .map((pageNumber) => `P${pageNumber}`)
    .join(", ");
}

function addFinding(
  findings: ComicPromptHealthFinding[],
  severity: ComicPromptHealthSeverity,
  key: string,
  message: string
) {
  findings.push({ severity, key, message });
}

function filterNeglectedFindings(
  findings: ComicPromptHealthFinding[],
  neglectedFindingKeys: Set<string>
) {
  if (neglectedFindingKeys.size === 0) {
    return findings;
  }

  return findings.filter((finding) => !neglectedFindingKeys.has(finding.key));
}

export function getComicPromptHealthSummary(
  promptOutput: ParsedComicPromptOutput | null,
  options: ComicPromptHealthOptions = {}
): ComicPromptHealthSummary {
  const neglectedFindingKeys = new Set(options.neglectedFindingKeys || []);

  if (!promptOutput) {
    const findings = filterNeglectedFindings(
      [
        {
          severity: "issue" as const,
          key: "prompt-package.missing",
          message: "Generate a 10-page prompt package before creating images."
        }
      ],
      neglectedFindingKeys
    );
    const issueCount = findings.filter((finding) => finding.severity === "issue").length;
    const warningCount = findings.length - issueCount;

    return {
      totalPages: 0,
      readyPages: 0,
      issueCount,
      warningCount,
      pages: [
        {
          pageNumber: 0,
          ready: issueCount === 0,
          issueCount,
          warningCount,
          dialogueLineCount: 0,
          uploadImageCount: 0,
          hasLetteringGuide: false,
          findings
        }
      ]
    };
  }

  const recurringContinuityObjectKeywords = getRecurringContinuityObjectKeywords(promptOutput);
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
      addFinding(findings, "issue", "page.image-prompt.missing", "Image prompt text is missing.");
    }

    if (page.panelCount !== page.panels.length) {
      addFinding(
        findings,
        "issue",
        "page.panel-count.mismatch",
        "Panel count does not match listed panels."
      );
    }

    if (![2, 3].includes(page.panelCount)) {
      addFinding(
        findings,
        "warning",
        "page.panel-count.production-rhythm",
        "Panel count is outside the 2-3 panel production rhythm."
      );
    }

    if (!pageHasLetteringGuide) {
      addFinding(
        findings,
        "issue",
        "page.lettering.missing",
        "Lettering/font direction is missing from this page prompt."
      );
    }

    if (uploadNames.length > MAX_REFERENCE_IMAGES_PER_PAGE) {
      addFinding(
        findings,
        "warning",
        "page.reference-uploads.too-many",
        `Reference upload count is ${uploadNames.length}; keep the image input set focused.`
      );
    }

    page.requiredUploads.forEach((upload) => {
      if (upload.uploadImageNames.length === 0 || upload.relativePaths.length === 0) {
        addFinding(
          findings,
          "warning",
          `page.reference-upload.incomplete-metadata:${normalizeText(upload.label || upload.slug)}`,
          `${upload.label || upload.slug} has incomplete reference file metadata.`
        );
      }
    });

    recurringContinuityObjectKeywords.forEach((pagesWithKeyword, keyword) => {
      if (!pagesWithKeyword.has(page.pageNumber)) {
        return;
      }

      if (pageHasContinuityReferenceForKeyword(page, keyword)) {
        return;
      }

      addFinding(
        findings,
        "warning",
        `page.recurring-prop.missing-reference:${keyword}`,
        `Recurring prop "${keyword}" appears on ${formatContinuityKeywordPages(
          pagesWithKeyword
        )} without a dedicated continuity reference or explicit lock on this page. Create/attach a prop, scene, or object reference before image generation.`
      );
    });

    page.panels.forEach((panel) => {
      if (!panel.promptText?.trim()) {
        addFinding(
          findings,
          "warning",
          "panel.prompt-text.missing",
          `Panel ${panel.panelNumber} is missing panel promptText.`
        );
      }

      if (!panel.dialogueLines?.length) {
        addFinding(
          findings,
          "issue",
          "panel.dialogue-lines.missing",
          `Panel ${panel.panelNumber} has no dialogueLines.`
        );
        return;
      }

      panel.dialogueLines.forEach((line, index) => {
        if (!line.speaker.trim() || !line.text.trim()) {
          addFinding(
            findings,
            "issue",
            "panel.dialogue-line.incomplete",
            `Panel ${panel.panelNumber} dialogue ${index + 1} is missing speaker or text.`
          );
          return;
        }

        if (!promptIncludesLine(page.promptPackCopyText, line.text)) {
          addFinding(
            findings,
            "issue",
            "panel.dialogue-line.not-in-image-prompt",
            `Panel ${panel.panelNumber} dialogue is not written into the image prompt.`
          );
        }
      });
    });

    const visibleFindings = filterNeglectedFindings(findings, neglectedFindingKeys);
    const issueCount = visibleFindings.filter((finding) => finding.severity === "issue").length;
    const warningCount = visibleFindings.length - issueCount;

    return {
      pageNumber: page.pageNumber,
      ready: issueCount === 0,
      issueCount,
      warningCount,
      dialogueLineCount: dialogueLines.length,
      uploadImageCount: uploadNames.length,
      hasLetteringGuide: pageHasLetteringGuide,
      findings: visibleFindings
    };
  });

  const pageCountFinding: ComicPromptHealthFinding | null =
    promptOutput.pages.length === REQUIRED_PAGE_COUNT
      ? null
      : {
          severity: "issue",
          key: "prompt-package.page-count",
          message: `Prompt package has ${promptOutput.pages.length} pages; expected ${REQUIRED_PAGE_COUNT}.`
        };
  const visiblePageCountFinding = pageCountFinding
    ? filterNeglectedFindings([pageCountFinding], neglectedFindingKeys)[0] || null
    : null;

  const pageCountIssues = visiblePageCountFinding?.severity === "issue" ? 1 : 0;
  const pageCountWarnings = visiblePageCountFinding?.severity === "warning" ? 1 : 0;
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
    pages: visiblePageCountFinding
      ? [
          {
            pageNumber: 0,
            ready: false,
            issueCount: pageCountIssues,
            warningCount: pageCountWarnings,
            dialogueLineCount: 0,
            uploadImageCount: 0,
            hasLetteringGuide: false,
            findings: [visiblePageCountFinding]
          },
          ...pages
        ]
      : pages
  };
}
