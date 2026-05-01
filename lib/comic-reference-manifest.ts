import manifestJson from "@/data/comic-reference-manifest.json";
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
  return sortReferenceRecords(manifest.characters[slug] || []);
}

export function getComicSceneReferenceFiles(slug: string) {
  const manifest = getManifest();
  return sortReferenceRecords(manifest.scenes[slug] || []);
}

export function getComicReferenceCharacterSlugs() {
  return Object.keys(getManifest().characters).sort((left, right) => left.localeCompare(right));
}

export function getComicChapterSceneReferenceState(seasonSlug: string, chapterSlug: string) {
  const manifest = getManifest();
  const fallbackFolder = getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug);
  const key = getComicChapterSceneReferenceKey(seasonSlug, chapterSlug);
  const chapterEntry = manifest.chapters[key];

  return {
    chapterSceneReferenceFolder: chapterEntry?.folder || fallbackFolder,
    chapterSceneReferences: chapterEntry?.references?.length
      ? sortReferenceRecords(chapterEntry.references)
      : []
  };
}
