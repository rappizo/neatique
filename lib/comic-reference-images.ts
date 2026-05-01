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
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

const COMIC_REFERENCE_ROOT = "comic";
const MAX_COMIC_REFERENCE_IMAGES = 16;
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
  bucket: StoredPromptUpload["bucket"] | "DETECTED_CHARACTER" | "DETECTED_CHAPTER_SCENE";
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
    ? toPrimaryReferenceRecord(fallbackFolder, "model-sheet.png", upload.label)
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

function addRequiredUploadReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  for (const upload of input.requiredUploads) {
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

    if (!aliases.some((alias) => isTextMentioned(input.promptText, alias))) {
      continue;
    }

    const records = getComicCharacterReferenceFiles(slug);
    const primaryRecord =
      records.find((record) => /model|sheet|front|master/i.test(record.fileName)) ||
      records[0] ||
      toPrimaryReferenceRecord(getComicCharacterReferenceFolder(slug), "model-sheet.png", `${displayName} reference`);

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
      !isTextMentioned(input.promptText, record.fileName)
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

function sortResolvedReferences(references: ComicResolvedReferenceImage[]) {
  const bucketOrder: Record<string, number> = {
    CHARACTER: 0,
    DETECTED_CHARACTER: 1,
    CHAPTER_SCENE: 2,
    DETECTED_CHAPTER_SCENE: 3,
    SCENE: 4
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

export async function resolveComicPageReferenceImages(
  input: ResolveComicPageReferenceImagesInput
) {
  const byPath = new Map<string, ComicResolvedReferenceImage>();

  addRequiredUploadReferences(input, byPath);
  addDetectedCharacterReferences(input, byPath);
  addDetectedChapterSceneReferences(input, byPath);

  return sortResolvedReferences(Array.from(byPath.values())).slice(0, MAX_COMIC_REFERENCE_IMAGES);
}

export async function loadComicReferenceImageFiles(
  references: ComicResolvedReferenceImage[]
): Promise<ComicReferenceImageFile[]> {
  const files = await Promise.all(
    references.map(async (reference) => {
      const absoluteUrl = toComicReferenceAbsoluteUrl(reference.relativePath);

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

        return {
          ...reference,
          data: new Uint8Array(await response.arrayBuffer()),
          mimeType
        };
      } catch {
        return null;
      }
    })
  );

  return files.filter(Boolean) as ComicReferenceImageFile[];
}
