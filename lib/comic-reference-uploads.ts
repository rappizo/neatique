import { Buffer } from "node:buffer";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";
import { slugify } from "@/lib/utils";

const WORKSPACE_ROOT = process.cwd();
const COMIC_ROOT = path.resolve(WORKSPACE_ROOT, "comic");
const PUBLIC_REFERENCE_ROOT = path.resolve(WORKSPACE_ROOT, "public", "comic-reference");
const MANIFEST_PATH = path.resolve(WORKSPACE_ROOT, "data", "comic-reference-manifest.json");
const MANIFEST_MODULE_PATH = path.resolve(
  WORKSPACE_ROOT,
  "data",
  "comic-reference-manifest.generated.ts"
);
const MAX_REFERENCE_UPLOAD_BYTES = 20 * 1024 * 1024;
const SUPPORTED_REFERENCE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp"
};

type ComicReferenceManifest = {
  generatedAt: string | null;
  characters: Record<string, ComicChapterSceneReferenceRecord[]>;
  scenes: Record<string, ComicChapterSceneReferenceRecord[]>;
  chapters: Record<
    string,
    {
      folder: string;
      references: ComicChapterSceneReferenceRecord[];
    }
  >;
};

type SaveComicReferenceUploadInput = {
  bucket: "character" | "scene";
  slug: string;
  relativeFolder: string;
  file: File | null;
  requestedFileName?: string | null;
  label?: string | null;
};

export class ComicReferenceUploadError extends Error {
  readonly status: string;

  constructor(status: string, message: string) {
    super(message);
    this.name = "ComicReferenceUploadError";
    this.status = status;
  }
}

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function getFileNameFromInput(value: string) {
  return normalizeSlashes(value).split("/").filter(Boolean).pop() || "";
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[a-z0-9]+$/i, "");
}

function getExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function getUploadExtension(file: File) {
  const mimeExtension = MIME_TYPE_EXTENSIONS[(file.type || "").toLowerCase()];
  const nameExtension = getExtension(file.name || "");

  if (mimeExtension) {
    return mimeExtension;
  }

  return SUPPORTED_REFERENCE_IMAGE_EXTENSIONS.has(nameExtension) ? nameExtension : "";
}

function isSupportedUpload(file: File) {
  const extension = getUploadExtension(file);
  return Boolean(extension && SUPPORTED_REFERENCE_IMAGE_EXTENSIONS.has(extension));
}

function toDisplayLabel(fileName: string, label?: string | null) {
  if (label?.trim()) {
    return label.trim();
  }

  return stripExtension(fileName)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function createEmptyManifest(): ComicReferenceManifest {
  return {
    generatedAt: null,
    characters: {},
    scenes: {},
    chapters: {}
  };
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function assertSafeFolder(relativeFolder: string) {
  const absoluteFolder = path.resolve(WORKSPACE_ROOT, relativeFolder);
  const relativeToComicRoot = path.relative(COMIC_ROOT, absoluteFolder);

  if (
    !relativeToComicRoot ||
    relativeToComicRoot.startsWith("..") ||
    path.isAbsolute(relativeToComicRoot)
  ) {
    throw new ComicReferenceUploadError(
      "reference-upload-failed",
      `Unsafe comic reference folder: ${relativeFolder}`
    );
  }

  return absoluteFolder;
}

function assertSafePublicReferencePath(targetPath: string) {
  const relativeToPublicRoot = path.relative(PUBLIC_REFERENCE_ROOT, targetPath);

  if (
    !relativeToPublicRoot ||
    relativeToPublicRoot.startsWith("..") ||
    path.isAbsolute(relativeToPublicRoot)
  ) {
    throw new ComicReferenceUploadError(
      "reference-upload-failed",
      `Unsafe public comic reference path: ${targetPath}`
    );
  }
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ComicReferenceManifest;
  } catch {
    return createEmptyManifest();
  }
}

function sortReferenceRecords(records: ComicChapterSceneReferenceRecord[]) {
  return [...records].sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function sortManifest(manifest: ComicReferenceManifest): ComicReferenceManifest {
  return {
    generatedAt: manifest.generatedAt,
    characters: Object.fromEntries(
      Object.entries(manifest.characters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slug, records]) => [slug, sortReferenceRecords(records)])
    ),
    scenes: Object.fromEntries(
      Object.entries(manifest.scenes)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slug, records]) => [slug, sortReferenceRecords(records)])
    ),
    chapters: Object.fromEntries(
      Object.entries(manifest.chapters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [
          key,
          {
            folder: entry.folder,
            references: sortReferenceRecords(entry.references || [])
          }
        ])
    )
  };
}

async function writeManifest(manifest: ComicReferenceManifest) {
  const nextManifest = sortManifest({ ...manifest, generatedAt: new Date().toISOString() });

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  await writeFile(MANIFEST_MODULE_PATH, toManifestModule(nextManifest), "utf8");
}

function toManifestModule(manifest: ComicReferenceManifest) {
  return [
    "import type { ComicChapterSceneReferenceRecord } from \"@/lib/types\";",
    "",
    "type ComicReferenceManifest = {",
    "  generatedAt: string | null;",
    "  characters: Record<string, ComicChapterSceneReferenceRecord[]>;",
    "  scenes: Record<string, ComicChapterSceneReferenceRecord[]>;",
    "  chapters: Record<string, { folder: string; references: ComicChapterSceneReferenceRecord[]; }>;",
    "};",
    "",
    `const comicReferenceManifest = ${JSON.stringify(manifest, null, 2)} satisfies ComicReferenceManifest;`,
    "",
    "export default comicReferenceManifest;",
    ""
  ].join("\n");
}

async function upsertManifestRecord(
  bucket: SaveComicReferenceUploadInput["bucket"],
  slug: string,
  record: ComicChapterSceneReferenceRecord
) {
  const manifest = await readManifest();
  const collection = bucket === "character" ? manifest.characters : manifest.scenes;
  const records = collection[slug] || [];
  collection[slug] = [
    ...records.filter(
      (candidate) =>
        candidate.relativePath !== record.relativePath && candidate.fileName !== record.fileName
    ),
    record
  ];
  await writeManifest(manifest);
}

async function createUploadFileName(
  folderPath: string,
  file: File,
  requestedFileName?: string | null
) {
  const extension = getUploadExtension(file);
  const sourceName = getFileNameFromInput(requestedFileName || file.name || "reference");
  const baseName = slugify(stripExtension(sourceName)) || "reference";
  const fileName = `${baseName}${extension}`;

  if (requestedFileName?.trim() || !(await pathExists(path.join(folderPath, fileName)))) {
    return fileName;
  }

  return `${baseName}-${Date.now()}${extension}`;
}

export async function saveComicReferenceUpload(input: SaveComicReferenceUploadInput) {
  if (!(input.file instanceof File) || input.file.size <= 0) {
    throw new ComicReferenceUploadError("missing-reference-upload", "No comic reference image was uploaded.");
  }

  if (input.file.size > MAX_REFERENCE_UPLOAD_BYTES) {
    throw new ComicReferenceUploadError(
      "reference-upload-too-large",
      "Comic reference image uploads are limited to 20 MB."
    );
  }

  if (!isSupportedUpload(input.file)) {
    throw new ComicReferenceUploadError(
      "reference-upload-type",
      "Comic reference uploads must be PNG, JPG, JPEG, or WEBP images."
    );
  }

  const folderPath = assertSafeFolder(input.relativeFolder);
  await mkdir(folderPath, { recursive: true });

  const fileName = await createUploadFileName(folderPath, input.file, input.requestedFileName);
  const workspacePath = path.join(folderPath, fileName);
  const relativePath = normalizeSlashes(path.relative(WORKSPACE_ROOT, workspacePath));
  const publicPath = path.join(PUBLIC_REFERENCE_ROOT, relativePath);
  assertSafePublicReferencePath(publicPath);

  const buffer = Buffer.from(await input.file.arrayBuffer());
  await writeFile(workspacePath, buffer);
  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(publicPath, buffer);

  const record: ComicChapterSceneReferenceRecord = {
    label: toDisplayLabel(fileName, input.label),
    fileName,
    relativePath,
    extension: getExtension(fileName).replace(/^\./, "")
  };

  await upsertManifestRecord(input.bucket, input.slug, record);

  return record;
}
