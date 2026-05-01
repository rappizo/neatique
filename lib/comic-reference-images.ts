import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { StoredPromptUpload } from "@/lib/comic-prompt-output";
import {
  getComicChapterSceneReferenceFolder,
  getComicCharacterReferenceFolder,
  getComicSceneReferenceFolder
} from "@/lib/comic-paths";
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

const COMIC_REFERENCE_ROOT = "comic";
const MAX_COMIC_REFERENCE_IMAGES = 16;
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const CHARACTER_REFERENCE_ALIASES: Record<string, string[]> = {
  artrans: ["安川西"],
  muci: ["慕西"],
  nia: ["尼亚"],
  padarana: ["啪嗒安娜"],
  padaruna: ["啪嗒瑞娜"],
  snacri: ["斯奈奎"]
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
  data: Buffer;
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
  return path.extname(fileName).toLowerCase();
}

function isSupportedReferenceImage(fileName: string) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(getExtension(fileName));
}

function toDisplayLabel(fileName: string) {
  const extension = path.extname(fileName);
  const base = fileName.slice(0, extension ? -extension.length : undefined);

  return base
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

export function getComicReferenceAbsolutePath(relativePath: string) {
  const normalized = normalizeComicReferencePath(relativePath);

  if (!normalized) {
    return null;
  }

  const root = path.join(process.cwd(), COMIC_REFERENCE_ROOT);
  const targetPath = path.normalize(path.join(process.cwd(), normalized));

  if (!targetPath.startsWith(root)) {
    return null;
  }

  return targetPath;
}

export function toComicReferenceMediaUrl(relativePath: string) {
  const normalized = normalizeComicReferencePath(relativePath);

  if (!normalized) {
    return "";
  }

  return `/media/comic-reference/${normalized
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

async function fileExists(relativePath: string) {
  const targetPath = getComicReferenceAbsolutePath(relativePath);

  if (!targetPath) {
    return false;
  }

  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listReferenceFolder(relativeFolder: string): Promise<ComicChapterSceneReferenceRecord[]> {
  const normalizedFolder = normalizeSlashes(relativeFolder).replace(/^\/+/, "");

  if (
    !normalizedFolder.startsWith(`${COMIC_REFERENCE_ROOT}/`) ||
    normalizedFolder.includes("\0") ||
    normalizedFolder.split("/").includes("..")
  ) {
    return [];
  }

  const folderPath = path.join(process.cwd(), normalizedFolder);

  try {
    const entries = await readdir(folderPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => fileName.toLowerCase() !== "readme.md")
      .filter(isSupportedReferenceImage)
      .sort((left, right) => left.localeCompare(right))
      .map((fileName) => ({
        label: toDisplayLabel(fileName),
        fileName,
        relativePath: normalizeSlashes(path.join(normalizedFolder, fileName)),
        extension: getExtension(fileName).replace(/^\./, "")
      }));
  } catch {
    return [];
  }
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

function findReferenceRecord(
  records: ComicChapterSceneReferenceRecord[],
  requestedName: string
) {
  const requestedFile = normalizeSlashes(requestedName).split("/").filter(Boolean).pop() || requestedName;
  const comparableRequest = normalizeComparable(requestedFile);

  return records.find((record) => {
    return (
      record.fileName.toLowerCase() === requestedFile.toLowerCase() ||
      normalizeComparable(record.fileName) === comparableRequest ||
      normalizeComparable(record.label) === comparableRequest
    );
  });
}

async function addReferenceImage(
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

  if (!normalized || byPath.has(normalized) || !(await fileExists(normalized))) {
    return;
  }

  const targetPath = getComicReferenceAbsolutePath(normalized);
  const fileStats = targetPath ? await stat(targetPath) : null;

  byPath.set(normalized, {
    bucket,
    slug,
    label: metadata.label || record.label,
    fileName: record.fileName,
    relativePath: normalized,
    imageUrl: toComicReferenceMediaUrl(normalized),
    mimeType: getMimeType(record.fileName),
    sizeBytes: fileStats?.size || 0,
    whyThisMatters: metadata.whyThisMatters || "Used as a direct image reference for this page.",
    contentSummary: metadata.contentSummary || record.label,
    source
  });
}

function getReferenceFoldersForUpload(
  upload: StoredPromptUpload,
  seasonSlug: string,
  chapterSlug: string
) {
  if (upload.bucket === "CHARACTER") {
    return [getComicCharacterReferenceFolder(upload.slug)];
  }

  if (upload.bucket === "SCENE") {
    return [getComicSceneReferenceFolder(upload.slug)];
  }

  return [getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug)];
}

async function addRequiredUploadReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  for (const upload of input.requiredUploads) {
    for (const relativePath of upload.relativePaths) {
      const normalized = normalizeComicReferencePath(relativePath);

      if (!normalized) {
        continue;
      }

      await addReferenceImage(
        upload.bucket,
        upload.slug,
        "prompt-required-upload",
        {
          label: upload.label,
          fileName: normalized.split("/").pop() || upload.label,
          relativePath: normalized,
          extension: getExtension(normalized).replace(/^\./, "")
        },
        {
          label: upload.label,
          whyThisMatters: upload.whyThisMatters,
          contentSummary: upload.contentSummary
        },
        byPath
      );
    }

    const folders = getReferenceFoldersForUpload(upload, input.seasonSlug, input.chapterSlug);
    const recordsByFolder = await Promise.all(folders.map((folder) => listReferenceFolder(folder)));
    const records = recordsByFolder.flat();

    if (upload.uploadImageNames.length === 0 && records.length > 0) {
      await addReferenceImage(
        upload.bucket,
        upload.slug,
        "prompt-required-upload",
        records[0],
        {
          label: upload.label || records[0].label,
          whyThisMatters: upload.whyThisMatters,
          contentSummary: upload.contentSummary
        },
        byPath
      );
      continue;
    }

    for (const uploadName of upload.uploadImageNames) {
      const matchedRecord = findReferenceRecord(records, uploadName);

      if (!matchedRecord) {
        continue;
      }

      await addReferenceImage(
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

async function addDetectedCharacterReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  const charactersRoot = path.join(process.cwd(), COMIC_REFERENCE_ROOT, "characters");
  let characterSlugs: string[] = [];

  try {
    characterSlugs = (await readdir(charactersRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return;
  }

  for (const slug of characterSlugs) {
    const displayName = slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    const aliases = [slug, displayName, ...(CHARACTER_REFERENCE_ALIASES[slug] || [])];

    if (!aliases.some((alias) => isTextMentioned(input.promptText, alias))) {
      continue;
    }

    const records = await listReferenceFolder(getComicCharacterReferenceFolder(slug));
    const primaryRecord =
      records.find((record) => /model|sheet|front|master/i.test(record.fileName)) || records[0];

    if (!primaryRecord) {
      continue;
    }

    await addReferenceImage(
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

async function addDetectedChapterSceneReferences(
  input: ResolveComicPageReferenceImagesInput,
  byPath: Map<string, ComicResolvedReferenceImage>
) {
  const records = await listReferenceFolder(
    getComicChapterSceneReferenceFolder(input.seasonSlug, input.chapterSlug)
  );

  for (const record of records) {
    if (
      !isTextMentioned(input.promptText, record.label) &&
      !isTextMentioned(input.promptText, record.fileName)
    ) {
      continue;
    }

    await addReferenceImage(
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

  await addRequiredUploadReferences(input, byPath);
  await addDetectedCharacterReferences(input, byPath);
  await addDetectedChapterSceneReferences(input, byPath);

  return sortResolvedReferences(Array.from(byPath.values())).slice(0, MAX_COMIC_REFERENCE_IMAGES);
}

export async function readComicReferenceImage(relativePath: string) {
  const normalized = normalizeComicReferencePath(relativePath);
  const targetPath = normalized ? getComicReferenceAbsolutePath(normalized) : null;

  if (!normalized || !targetPath) {
    return null;
  }

  try {
    const data = await readFile(targetPath);

    return {
      data,
      relativePath: normalized,
      fileName: path.basename(normalized),
      mimeType: getMimeType(normalized)
    };
  } catch {
    return null;
  }
}

export async function loadComicReferenceImageFiles(
  references: ComicResolvedReferenceImage[]
): Promise<ComicReferenceImageFile[]> {
  const files = await Promise.all(
    references.map(async (reference) => {
      const image = await readComicReferenceImage(reference.relativePath);

      if (!image) {
        return null;
      }

      return {
        ...reference,
        data: image.data,
        mimeType: image.mimeType
      };
    })
  );

  return files.filter(Boolean) as ComicReferenceImageFile[];
}
