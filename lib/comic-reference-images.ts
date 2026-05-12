import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredPromptUpload } from "@/lib/comic-prompt-output";
import {
  getComicCharacterReferenceFiles,
  getComicChapterSceneReferenceState,
  getComicReferenceCharacterSlugs,
  getComicSceneReferenceFiles
} from "@/lib/comic-reference-manifest";
import {
  getComicChapterSceneReferenceFolder,
  getComicCharacterReferenceFolder,
  getComicSceneReferenceFolder
} from "@/lib/comic-paths";
import {
  getComicCharacterHeightChartReference,
  getComicCharacterHeightChartSlugs,
  getSimilarTeardropComparisonReference,
  getSimilarTeardropCharacterSlugs,
  shouldUseComicCharacterHeightChart,
  shouldUseSimilarTeardropComparison
} from "@/lib/comic-similar-character-locks";
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

const COMIC_REFERENCE_ROOT = "comic";
const COMIC_LOGO_PUBLIC_PATH = "/images/comiclogo.png";
const DEFAULT_MAX_COMIC_REFERENCE_IMAGES = 8;
const DEFAULT_MAX_COMIC_CHARACTER_REFERENCE_IMAGES = 5;
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const FALLBACK_CHARACTER_SLUGS = [
  "artrans",
  "coach-ray",
  "dewey-dot",
  "mira-mistwell",
  "muci",
  "nia",
  "padarana",
  "padaruna",
  "professor-cera-lin",
  "snacri",
  "sunny-spritz",
  "vela-sheen"
];
const CHARACTER_REFERENCE_ALIASES: Record<string, string[]> = {
  artrans: ["\u5b89\u5ddd\u897f"],
  muci: ["\u6155\u897f"],
  nia: ["\u5c3c\u4e9a"],
  padarana: ["\u556a\u55d2\u5b89\u5a1c"],
  padaruna: ["\u556a\u55d2\u745e\u5a1c"],
  snacri: ["\u65af\u5948\u594e"],
  "sunny-spritz": ["Sunny", "Sunny Spritz"],
  "vela-sheen": ["Vela", "Vela Sheen"]
};
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export type ComicResolvedReferenceImage = {
  bucket:
    | StoredPromptUpload["bucket"]
    | "DETECTED_CHARACTER"
    | "DETECTED_CHAPTER_SCENE"
    | "CAST_COMPARISON"
    | "PRODUCT_LOCK"
    | "BRAND_LOGO";
  label: string;
  slug: string;
  fileName: string;
  relativePath: string;
  imageUrl: string;
  mimeType: string;
  sizeBytes: number;
  whyThisMatters: string;
  contentSummary: string;
  source: "prompt-required-upload" | "auto-detected";
};

export type ComicReferenceImageFile = ComicResolvedReferenceImage & {
  data: Uint8Array;
};

type ResolveComicPageReferenceImagesInput = {
  requiredUploads: StoredPromptUpload[];
  seasonSlug: string;
  chapterSlug: string;
  promptText: string;
};

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function getExtension(fileName: string) {
  const normalized = normalizeSlashes(fileName);
  const filePart = normalized.split("/").filter(Boolean).pop() || normalized;
  const match = filePart.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : "";
}

function isSupportedReferenceImage(fileName: string) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(getExtension(fileName));
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}

function toDisplayLabel(fileName: string) {
  return stripExtension(fileName)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getMimeType(fileName: string) {
  return MIME_TYPES[getExtension(fileName)] || "application/octet-stream";
}

function getMaxComicReferenceImages() {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_MAX_COMIC_REFERENCE_IMAGES;
  }

  return Math.min(Math.max(configured, 4), 16);
}

function getMaxComicCharacterReferenceImages(maxReferences: number) {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_MAX_CHARACTER_REFERENCES || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return Math.min(DEFAULT_MAX_COMIC_CHARACTER_REFERENCE_IMAGES, maxReferences);
  }

  return Math.min(Math.max(configured, 2), maxReferences);
}

export function normalizeComicReferencePath(relativePath: string) {
  const normalized = normalizeSlashes(relativePath.trim()).replace(/^\/+/, "");

  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.split("/").includes("..") ||
    !normalized.startsWith(`${COMIC_REFERENCE_ROOT}/`) ||
    !isSupportedReferenceImage(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function toComicReferenceMediaUrl(relativePath: string) {
  const normalized = normalizeComicReferencePath(relativePath);

  if (!normalized) {
    return "";
  }

  return `/comic-reference/${normalized
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function getComicReferenceBaseUrl() {
  const explicitBaseUrl = process.env.OPENAI_COMIC_REFERENCE_BASE_URL;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const vercelBaseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const configuredBaseUrl =
    explicitBaseUrl ||
    (publicBaseUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(publicBaseUrl)
      ? publicBaseUrl
      : "") ||
    vercelBaseUrl ||
    publicBaseUrl ||
    "http://localhost:3000";

  return configuredBaseUrl.replace(/\/+$/, "");
}

function toComicReferenceAbsoluteUrl(relativePath: string) {
  const mediaUrl = toComicReferenceMediaUrl(relativePath);

  if (!mediaUrl) {
    return null;
  }

  return new URL(mediaUrl, `${getComicReferenceBaseUrl()}/`).toString();
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isTextMentioned(text: string, value: string) {
  if (value && text.toLowerCase().includes(value.toLowerCase())) {
    return true;
  }

  const comparableText = normalizeComparable(text);
  const comparableValue = normalizeComparable(value);

  if (!comparableValue) {
    return false;
  }

  return comparableText.includes(comparableValue);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAliasMentionWindows(text: string, alias: string) {
  const comparableAlias = normalizeComparable(alias);

  if (!comparableAlias) {
    return [];
  }

  const aliasPattern = comparableAlias
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp)
    .join("[\\s_-]+");
  const regex = new RegExp(`(^|[^a-z0-9])(${aliasPattern})(?=$|[^a-z0-9])`, "gi");
  const windows: string[] = [];

  for (const match of text.matchAll(regex)) {
    const aliasStart = (match.index || 0) + (match[1]?.length || 0);
    const windowStart = Math.max(0, aliasStart - 90);
    const windowEnd = Math.min(text.length, aliasStart + match[2].length + 90);
    windows.push(text.slice(windowStart, windowEnd));
  }

  return windows;
}

function isInactiveCharacterMentionWindow(window: string, alias: string) {
  const comparableAlias = normalizeComparable(alias);
  const comparableWindow = normalizeComparable(window);

  if (!comparableAlias || !comparableWindow.includes(comparableAlias)) {
    return false;
  }

  const aliasPattern = escapeRegExp(comparableAlias).replace(/\\ /g, "\\s+");
  const negativeMentionPatterns = [
    new RegExp(`\\b(?:not|never|no|without|exclude|avoid)\\s+${aliasPattern}\\b`, "i"),
    new RegExp(`\\bdo\\s+not\\s+(?:draw|add|include|use|copy|borrow|import)\\s+${aliasPattern}\\b`, "i"),
    new RegExp(`\\b${aliasPattern}\\s+(?:must\\s+not|should\\s+not|does\\s+not)\\s+appear\\b`, "i"),
    new RegExp(`\\b${aliasPattern}\\s+is\\s+(?:absent|not\\s+present|not\\s+visible)\\b`, "i")
  ];
  const noteOnlyPatterns = [
    new RegExp(
      `\\b${aliasPattern}(?:\\s+s)?\\s+(?:old\\s+|past\\s+|prior\\s+|earlier\\s+|warning\\s+)*(?:note|message|slip|memo|clue|reminder|annotation)\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?:note|message|slip|memo|clue|reminder|annotation)\\s+from\\s+${aliasPattern}\\b`,
      "i"
    )
  ];

  return [...negativeMentionPatterns, ...noteOnlyPatterns].some((pattern) =>
    pattern.test(comparableWindow)
  );
}

function isActiveCharacterMention(text: string, aliases: string[]) {
  for (const alias of aliases) {
    const windows = getAliasMentionWindows(text, alias);

    if (windows.length === 0) {
      continue;
    }

    if (windows.some((window) => !isInactiveCharacterMentionWindow(window, alias))) {
      return true;
    }
  }

  return false;
}

function getFileNameFromPath(value: string) {
  return normalizeSlashes(value).split("/").filter(Boolean).pop() || value;
}

function toRecordFromPath(relativePath: string, label?: string): ComicChapterSceneReferenceRecord | null {
  const normalized = normalizeComicReferencePath(relativePath);

  if (!normalized) {
    return null;
  }

  const fileName = getFileNameFromPath(normalized);

  return {
    label: label || toDisplayLabel(fileName),
    fileName,
    relativePath: normalized,
    extension: getExtension(fileName).replace(/^\./, "")
  };
}

function toPrimaryReferenceRecord(
  folder: string,
  fileName: string,
  label?: string
): ComicChapterSceneReferenceRecord | null {
  if (!fileName || !isSupportedReferenceImage(fileName)) {
    return null;
  }

  return toRecordFromPath(`${folder}/${fileName}`, label);
}

function getReferenceRecordsForUpload(
  upload: StoredPromptUpload,
  seasonSlug: string,
  chapterSlug: string
) {
  if (upload.bucket === "CHARACTER") {
    return getComicCharacterReferenceFiles(upload.slug);
  }

  if (upload.bucket === "SCENE") {
    return getComicSceneReferenceFiles(upload.slug);
  }

  return getComicChapterSceneReferenceState(seasonSlug, chapterSlug).chapterSceneReferences;
}

function getReferenceFolderForUpload(
  upload: StoredPromptUpload,
  seasonSlug: string,
  chapterSlug: string
) {
  if (upload.bucket === "CHARACTER") {
    return getComicCharacterReferenceFolder(upload.slug);
  }

  if (upload.bucket === "SCENE") {
    return getComicSceneReferenceFolder(upload.slug);
  }

  return getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug);
}

function findReferenceRecord(
  records: ComicChapterSceneReferenceRecord[],
  requestedName: string
) {
  const requestedFile = getFileNameFromPath(requestedName);
  const comparableRequest = normalizeComparable(requestedFile);

  return records.find((record) => {
    return (
      record.fileName.toLowerCase() === requestedFile.toLowerCase() ||
      normalizeComparable(record.fileName) === comparableRequest ||
      normalizeComparable(record.label) === comparableRequest
    );
  });
}

function findReferenceRecordByPath(
  records: ComicChapterSceneReferenceRecord[],
  requestedPath: string
) {
  const normalizedPath = normalizeComicReferencePath(requestedPath);
  const requestedFile = getFileNameFromPath(requestedPath);
  const comparableRequest = normalizeComparable(requestedFile);

  return records.find((record) => {
    return (
      record.relativePath === normalizedPath ||
      record.fileName.toLowerCase() === requestedFile.toLowerCase() ||
      normalizeComparable(record.fileName) === comparableRequest
    );
  });
}

function getPrimaryReferenceRecordForUpload(
  upload: StoredPromptUpload,
  records: ComicChapterSceneReferenceRecord[],
  fallbackFolder: string
) {
  const manifestRecord =
    records.find((record) => /model|sheet|front|master/i.test(record.fileName)) ||
    records[0] ||
    null;

  if (manifestRecord) {
    return manifestRecord;
  }

  return upload.bucket === "CHARACTER"
    ? toPrimaryReferenceRecord(fallbackFolder, "model-sheet.jpg", upload.label)
    : null;
}

function addReferenceImage(
  bucket: ComicResolvedReferenceImage["bucket"],
  slug: string,
  source: ComicResolvedReferenceImage["source"],
  record: ComicChapterSceneReferenceRecord,
  metadata: {
    label?: string;
    whyThisMatters?: string;
    contentSummary?: string;
  },
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  const normalized = normalizeComicReferencePath(record.relativePath);

  if (!normalized || byPath.has(normalized)) {
    return;
  }

  byPath.set(normalized, {
    bucket,
    slug,
    label: metadata.label || record.label,
    fileName: record.fileName,
    relativePath: normalized,
    imageUrl: toComicReferenceMediaUrl(normalized),
    mimeType: getMimeType(record.fileName),
    sizeBytes: 0,
    whyThisMatters: metadata.whyThisMatters || "Used as a direct image reference for this page.",
    contentSummary: metadata.contentSummary || record.label,
    source
  });
}

function shouldUseComicLogoUpload(upload: StoredPromptUpload) {
  return (
    upload.bucket === "BRAND_LOGO" ||
    upload.relativePaths.some((relativePath) =>
      normalizeSlashes(relativePath).toLowerCase().endsWith("images/comiclogo.png")
    )
  );
}

function addComicLogoReference(byPath: Map<string, ComicResolvedReferenceImage>) {
  if (byPath.has(COMIC_LOGO_PUBLIC_PATH)) {
    return;
  }

  byPath.set(COMIC_LOGO_PUBLIC_PATH, {
    bucket: "BRAND_LOGO",
    slug: "comic-logo",
    label: "Neatique comic title logo",
    fileName: "comiclogo.png",
    relativePath: COMIC_LOGO_PUBLIC_PATH,
    imageUrl: COMIC_LOGO_PUBLIC_PATH,
    mimeType: "image/png",
    sizeBytes: 0,
    whyThisMatters:
      "Used as the exact title-logo reference for the top of the comic cover page.",
    contentSummary: "Uploaded comic title logo for cover-page branding.",
    source: "prompt-required-upload"
  });
}

function addRequiredUploadReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  for (const upload of input.requiredUploads) {
    if (shouldUseComicLogoUpload(upload)) {
      addComicLogoReference(byPath);
      continue;
    }

    const records = getReferenceRecordsForUpload(upload, input.seasonSlug, input.chapterSlug);
    const fallbackFolder = getReferenceFolderForUpload(upload, input.seasonSlug, input.chapterSlug);
    const primaryRecord = getPrimaryReferenceRecordForUpload(upload, records, fallbackFolder);

    for (const relativePath of upload.relativePaths) {
      const record =
        findReferenceRecordByPath(records, relativePath) ||
        (upload.bucket === "CHARACTER" ? primaryRecord : null);

      if (!record) {
        continue;
      }

      addReferenceImage(
        upload.bucket,
        upload.slug,
        "prompt-required-upload",
        record,
        {
          label: upload.label,
          whyThisMatters: upload.whyThisMatters,
          contentSummary: upload.contentSummary
        },
        byPath
      );
    }

    if (upload.uploadImageNames.length === 0) {
      if (primaryRecord) {
        addReferenceImage(
          upload.bucket,
          upload.slug,
          "prompt-required-upload",
          primaryRecord,
          {
            label: upload.label || primaryRecord.label,
            whyThisMatters: upload.whyThisMatters,
            contentSummary: upload.contentSummary
          },
          byPath
        );
      }

      continue;
    }

    for (const uploadName of upload.uploadImageNames) {
      const matchedRecord =
        findReferenceRecord(records, uploadName) ||
        (upload.bucket === "CHARACTER" ? primaryRecord : null);

      if (!matchedRecord) {
        continue;
      }

      addReferenceImage(
        upload.bucket,
        upload.slug,
        "prompt-required-upload",
        matchedRecord,
        {
          label: upload.label || matchedRecord.label,
          whyThisMatters: upload.whyThisMatters,
          contentSummary: upload.contentSummary
        },
        byPath
      );
    }
  }
}

function getCharacterSlugsForDetection() {
  return Array.from(
    new Set([...getComicReferenceCharacterSlugs(), ...FALLBACK_CHARACTER_SLUGS])
  ).sort((left, right) => left.localeCompare(right));
}

function addDetectedCharacterReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  for (const slug of getCharacterSlugsForDetection()) {
    const displayName = slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    const aliases = [slug, displayName, ...(CHARACTER_REFERENCE_ALIASES[slug] || [])];

    if (!isActiveCharacterMention(input.promptText, aliases)) {
      continue;
    }

    const records = getComicCharacterReferenceFiles(slug);
    const primaryRecord =
      records.find((record) => /model|sheet|front|master/i.test(record.fileName)) ||
      records[0] ||
      toPrimaryReferenceRecord(getComicCharacterReferenceFolder(slug), "model-sheet.jpg", `${displayName} reference`);

    if (!primaryRecord) {
      continue;
    }

    addReferenceImage(
      "DETECTED_CHARACTER",
      slug,
      "auto-detected",
      primaryRecord,
      {
        label: `${displayName} reference`,
        whyThisMatters: `${displayName} appears in the page prompt, so this model sheet is attached as a direct reference.`,
        contentSummary: `${displayName} locked character model reference.`
      },
      byPath
    );
  }
}

function getChapterSceneReferenceAliases(record: ComicChapterSceneReferenceRecord) {
  const comparable = normalizeComparable(`${record.label} ${record.fileName}`);

  if (comparable.includes("student handbook") && comparable.includes("old edition")) {
    return [
      "old handbook",
      "old student handbook",
      "student handbook",
      "student handbook old edition",
      "Student Handbook (old edition)"
    ];
  }

  if (comparable.includes("sunscreen field handbook")) {
    return ["sunscreen field handbook", "field handbook"];
  }

  if (comparable.includes("scratched ring mark") || comparable.includes("ring mark")) {
    return [
      "ring mark",
      "ring symbol",
      "ring insignia",
      "scratched mark",
      "scratched-out ring mark",
      "removed mark",
      "old plaque mark",
      "Luster Circle clue",
      "Luster Circle mark",
      "\u73af\u5f62\u5370\u8bb0",
      "\u73af\u5f62\u7b26\u53f7",
      "\u88ab\u522e\u6389\u7684\u73af\u5f62\u5370\u8bb0"
    ];
  }

  return [];
}

function addDetectedChapterSceneReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  const records = getComicChapterSceneReferenceState(
    input.seasonSlug,
    input.chapterSlug
  ).chapterSceneReferences;

  for (const record of records) {
    if (
      !isTextMentioned(input.promptText, record.label) &&
      !isTextMentioned(input.promptText, record.fileName) &&
      !getChapterSceneReferenceAliases(record).some((alias) =>
        isTextMentioned(input.promptText, alias)
      )
    ) {
      continue;
    }

    addReferenceImage(
      "DETECTED_CHAPTER_SCENE",
      normalizeComparable(record.label).replace(/\s+/g, "-") || "chapter-scene",
      "auto-detected",
      record,
      {
        whyThisMatters: `${record.label} is mentioned in the page prompt, so this scene reference is attached.`,
        contentSummary: `${record.label} chapter scene reference.`
      },
      byPath
    );
  }
}

function addSimilarTeardropComparisonReference(byPath: Map<string, ComicResolvedReferenceImage>) {
  const characterSlugs = Array.from(
    new Set(
      Array.from(byPath.values())
        .filter(isCharacterReference)
        .map((reference) => reference.slug)
    )
  );
  const similarSlugs = getSimilarTeardropCharacterSlugs(characterSlugs);

  if (!shouldUseSimilarTeardropComparison(similarSlugs)) {
    return;
  }

  const reference = getSimilarTeardropComparisonReference(similarSlugs);

  addReferenceImage(
    "CAST_COMPARISON",
    similarSlugs.includes("snacri")
      ? "similar-teardrop-character-comparison"
      : "active-teardrop-character-comparison",
    "auto-detected",
    reference,
    {
      label: reference.label,
      whyThisMatters: `${similarSlugs
        .map((slug) => slug.replace(/-/g, " "))
        .join(", ")} appear together; this active-cast comparison sheet prevents similar black-and-white droplet characters from blending.`,
      contentSummary:
        "Side-by-side identity comparison for the active similar droplet characters: silhouette, body width, head direction, eyes/brow, default expression, and broad size separation."
    },
    byPath
  );
}

function addComicCharacterHeightChartReference(byPath: Map<string, ComicResolvedReferenceImage>) {
  const characterSlugs = Array.from(
    new Set(
      Array.from(byPath.values())
        .filter(isCharacterReference)
        .map((reference) => reference.slug)
    )
  );
  const heightSlugs = getComicCharacterHeightChartSlugs(characterSlugs);

  if (!shouldUseComicCharacterHeightChart(heightSlugs)) {
    return;
  }

  const reference = getComicCharacterHeightChartReference(heightSlugs);

  addReferenceImage(
    "CAST_COMPARISON",
    heightSlugs.includes("snacri")
      ? "comic-character-height-comparison"
      : "active-character-height-comparison",
    "auto-detected",
    reference,
    {
      label: reference.label,
      whyThisMatters: `${heightSlugs
        .map((slug) => slug.replace(/-/g, " "))
        .join(", ")} appear together; this active-cast front-view reference locks their relative heights before composition.`,
      contentSummary:
        "Front-view character height reference using active model-sheet crops. Reference-only, never visible in the comic panel."
    },
    byPath
  );
}

function sortResolvedReferences(references: ComicResolvedReferenceImage[]) {
  const bucketOrder: Record<string, number> = {
    BRAND_LOGO: 0,
    CHARACTER: 1,
    DETECTED_CHARACTER: 2,
    CAST_COMPARISON: 3,
    PRODUCT_LOCK: 4,
    CHAPTER_SCENE: 5,
    DETECTED_CHAPTER_SCENE: 6,
    SCENE: 7
  };

  return [...references].sort((left, right) => {
    const bucketDelta = (bucketOrder[left.bucket] ?? 9) - (bucketOrder[right.bucket] ?? 9);

    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    if (left.source !== right.source) {
      return left.source === "prompt-required-upload" ? -1 : 1;
    }

    return left.label.localeCompare(right.label);
  });
}

function isCharacterReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "CHARACTER" || reference.bucket === "DETECTED_CHARACTER";
}

function isBrandLogoReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "BRAND_LOGO";
}

function isChapterSceneReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "CHAPTER_SCENE" || reference.bucket === "DETECTED_CHAPTER_SCENE";
}

function isRequiredChapterSceneReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "CHAPTER_SCENE" && reference.source === "prompt-required-upload";
}

function isCastComparisonReference(reference: ComicResolvedReferenceImage) {
  return reference.bucket === "CAST_COMPARISON";
}

function selectResolvedReferences(references: ComicResolvedReferenceImage[]) {
  const sorted = sortResolvedReferences(references);
  const maxReferences = getMaxComicReferenceImages();
  const maxCharacterReferences = getMaxComicCharacterReferenceImages(maxReferences);
  const selected = new Map<string, ComicResolvedReferenceImage>();

  function addWhere(
    predicate: (reference: ComicResolvedReferenceImage) => boolean,
    limit: number
  ) {
    let count = 0;

    for (const reference of sorted) {
      if (selected.size >= maxReferences || count >= limit) {
        break;
      }

      if (!predicate(reference) || selected.has(reference.relativePath)) {
        continue;
      }

      selected.set(reference.relativePath, reference);
      count += 1;
    }
  }

  addWhere(isBrandLogoReference, Math.min(1, maxReferences));
  const castComparisonCount = sorted.filter(isCastComparisonReference).length;
  const reservedCastReferenceCount = Math.min(
    castComparisonCount,
    Math.max(0, Math.min(2, maxReferences - selected.size - 1))
  );
  addWhere(
    isCharacterReference,
    Math.min(
      maxCharacterReferences,
      Math.max(0, maxReferences - selected.size - reservedCastReferenceCount)
    )
  );
  addWhere(
    isRequiredChapterSceneReference,
    Math.max(0, Math.min(2, maxReferences - selected.size))
  );
  addWhere(isCastComparisonReference, Math.max(0, Math.min(2, maxReferences - selected.size)));
  addWhere(isChapterSceneReference, Math.max(1, Math.min(2, maxReferences - selected.size)));
  addWhere((reference) => reference.bucket === "SCENE", Math.max(0, maxReferences - selected.size));
  addWhere(() => true, maxReferences - selected.size);

  return sortResolvedReferences(Array.from(selected.values()));
}

export async function resolveComicPageReferenceImages(
  input: ResolveComicPageReferenceImagesInput
) {
  const byPath = new Map<string, ComicResolvedReferenceImage>();

  addRequiredUploadReferences(input, byPath);
  addDetectedCharacterReferences(input, byPath);
  addDetectedChapterSceneReferences(input, byPath);
  addSimilarTeardropComparisonReference(byPath);
  addComicCharacterHeightChartReference(byPath);

  return selectResolvedReferences(Array.from(byPath.values()));
}

async function readLocalComicReferenceImage(relativePath: string) {
  const normalized = normalizeComicReferencePath(relativePath);

  if (!normalized) {
    return null;
  }

  try {
    return await readFile(join(process.cwd(), "public", "comic-reference", normalized));
  } catch {
    return null;
  }
}

async function readLocalComicLogoImage() {
  const candidates = [
    join(process.cwd(), "public", "images", "comiclogo.png"),
    join(process.cwd(), "images", "comiclogo.png"),
    join(process.cwd(), "images", "ComicLogo.png")
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

export async function loadComicReferenceImageFiles(
  references: ComicResolvedReferenceImage[]
): Promise<ComicReferenceImageFile[]> {
  const files = await Promise.all(
    references.map(async (reference) => {
      const localBuffer =
        reference.bucket === "BRAND_LOGO"
          ? await readLocalComicLogoImage()
          : await readLocalComicReferenceImage(reference.relativePath);

      if (localBuffer) {
        return {
          ...reference,
          data: new Uint8Array(localBuffer),
          mimeType: reference.mimeType || getMimeType(reference.fileName),
          sizeBytes: localBuffer.byteLength
        };
      }

      const absoluteUrl =
        reference.bucket === "BRAND_LOGO"
          ? new URL(reference.imageUrl, `${getComicReferenceBaseUrl()}/`).toString()
          : toComicReferenceAbsoluteUrl(reference.relativePath);

      if (!absoluteUrl) {
        return null;
      }

      try {
        const response = await fetch(absoluteUrl);

        if (!response.ok) {
          return null;
        }

        const mimeType =
          response.headers.get("content-type")?.split(";")[0]?.trim() ||
          reference.mimeType ||
          getMimeType(reference.fileName);

        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        return {
          ...reference,
          data,
          mimeType,
          sizeBytes: Number(response.headers.get("content-length") || data.byteLength)
        };
      } catch {
        return null;
      }
    })
  );

  return files.filter(Boolean) as ComicReferenceImageFile[];
}
