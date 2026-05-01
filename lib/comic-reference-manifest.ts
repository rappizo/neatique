import manifestJson from "@/data/comic-reference-manifest.json";
import { readdirSync } from "node:fs";
import path from "node:path";
import { getComicChapterSceneReferenceFolder, getComicChapterSceneReferenceKey } from "@/lib/comic-paths";
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

type ComicReferenceManifestEntry = {
  folder: string;
  references: ComicChapterSceneReferenceRecord[];
};

type ComicReferenceManifest = {
  generatedAt: string | null;
  characters: Record<string, ComicChapterSceneReferenceRecord[]>;
  scenes: Record<string, ComicChapterSceneReferenceRecord[]>;
  chapters: Record<string, ComicReferenceManifestEntry>;
};

const EMPTY_MANIFEST: ComicReferenceManifest = {
  generatedAt: null,
  characters: {},
  scenes: {},
  chapters: {}
};
const SUPPORTED_COMIC_REFERENCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function toDisplayLabel(fileName: string) {
  const extension = path.extname(fileName);
  const base = fileName.slice(0, extension ? -extension.length : undefined);

  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toRelativeWorkspacePath(targetPath: string) {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, "/");
}

function listReferenceFilesFromFolder(relativeFolder: string) {
  const folderPath = path.join(process.cwd(), relativeFolder);

  try {
    return readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => fileName.toLowerCase() !== "readme.md")
      .filter((fileName) => SUPPORTED_COMIC_REFERENCE_EXTENSIONS.has(path.extname(fileName).toLowerCase()))
      .sort((left, right) => left.localeCompare(right))
      .map((fileName) => ({
        label: toDisplayLabel(fileName),
        fileName,
        relativePath: toRelativeWorkspacePath(path.join(folderPath, fileName)),
        extension: path.extname(fileName).replace(/^\./, "").toLowerCase()
      }));
  } catch {
    return [];
  }
}

function normalizeReferenceRecord(
  value: ComicChapterSceneReferenceRecord
): ComicChapterSceneReferenceRecord {
  return {
    label: value.label,
    fileName: value.fileName,
    relativePath: value.relativePath,
    extension: value.extension
  };
}

function sortReferenceRecords(records: ComicChapterSceneReferenceRecord[]) {
  return [...records]
    .map(normalizeReferenceRecord)
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function getManifest(): ComicReferenceManifest {
  const value = manifestJson as ComicReferenceManifest | null;
  if (!value || typeof value !== "object") {
    return EMPTY_MANIFEST;
  }

  return {
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    characters: value.characters && typeof value.characters === "object" ? value.characters : {},
    scenes: value.scenes && typeof value.scenes === "object" ? value.scenes : {},
    chapters: value.chapters && typeof value.chapters === "object" ? value.chapters : {}
  };
}

export function getComicReferenceManifestGeneratedAt() {
  return getManifest().generatedAt;
}

export function getComicCharacterReferenceFiles(slug: string) {
  const manifest = getManifest();
  const manifestRecords = sortReferenceRecords(manifest.characters[slug] || []);

  return manifestRecords.length > 0
    ? manifestRecords
    : listReferenceFilesFromFolder(`comic/characters/${slug}/refs`);
}

export function getComicSceneReferenceFiles(slug: string) {
  const manifest = getManifest();
  const manifestRecords = sortReferenceRecords(manifest.scenes[slug] || []);

  return manifestRecords.length > 0
    ? manifestRecords
    : listReferenceFilesFromFolder(`comic/scenes/${slug}/refs`);
}

export function getComicChapterSceneReferenceState(seasonSlug: string, chapterSlug: string) {
  const manifest = getManifest();
  const fallbackFolder = getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug);
  const key = getComicChapterSceneReferenceKey(seasonSlug, chapterSlug);
  const chapterEntry = manifest.chapters[key];

  return {
    chapterSceneReferenceFolder: chapterEntry?.folder || fallbackFolder,
    chapterSceneReferences:
      chapterEntry?.references?.length
        ? sortReferenceRecords(chapterEntry.references)
        : listReferenceFilesFromFolder(fallbackFolder)
  };
}
