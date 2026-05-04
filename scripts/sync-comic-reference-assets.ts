import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  compressComicReferenceImage,
  getCompressedComicReferenceFileName,
  type ComicReferenceCompressionBucket
} from "@/lib/comic-reference-compression";
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

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

const WORKSPACE_ROOT = process.cwd();
const COMIC_ROOT = path.resolve(WORKSPACE_ROOT, "comic");
const PUBLIC_ROOT = path.resolve(WORKSPACE_ROOT, "public");
const PUBLIC_REFERENCE_ROOT = path.resolve(PUBLIC_ROOT, "comic-reference");
const MANIFEST_PATH = path.resolve(WORKSPACE_ROOT, "data", "comic-reference-manifest.json");
const MANIFEST_MODULE_PATH = path.resolve(
  WORKSPACE_ROOT,
  "data",
  "comic-reference-manifest.generated.ts"
);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

function getExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function isSupportedImage(fileName: string) {
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildChapterSceneSlug(seasonSlug: string, chapterSlug: string, sceneLabel: string) {
  return slugify(`${seasonSlug}-${chapterSlug}-${sceneLabel}`);
}

function getReferenceBucketFromRelativePath(relativePath: string): ComicReferenceCompressionBucket {
  const parts = normalizeSlashes(relativePath).split("/");

  if (parts.length >= 4 && parts[0] === "comic" && parts[1] === "characters" && parts[3] === "refs") {
    return "character";
  }

  if (parts.includes("scene-refs")) {
    return "chapter-scene";
  }

  if (parts.length >= 4 && parts[0] === "comic" && parts[1] === "scenes" && parts[3] === "refs") {
    return "scene";
  }

  return "unknown";
}

function toCompressedReferenceRelativePath(sourceRelativePath: string, extension: ".jpg") {
  const directory = path.dirname(sourceRelativePath);
  const fileName = getCompressedComicReferenceFileName(path.basename(sourceRelativePath), extension);

  return normalizeSlashes(path.join(directory, fileName));
}

function toReferenceRecord(relativePath: string): ComicChapterSceneReferenceRecord {
  const fileName = path.basename(relativePath);

  return {
    label: toDisplayLabel(fileName),
    fileName,
    relativePath: normalizeSlashes(relativePath),
    extension: getExtension(fileName).replace(/^\./, "")
  };
}

function createEmptyManifest(): ComicReferenceManifest {
  return {
    generatedAt: null,
    characters: {},
    scenes: {},
    chapters: {}
  };
}

function stripGeneratedAt(manifest: ComicReferenceManifest) {
  return {
    ...manifest,
    generatedAt: null
  };
}

async function readExistingManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ComicReferenceManifest;
  } catch {
    return null;
  }
}

function assertSafeGeneratedReferenceRoot() {
  const relative = path.relative(PUBLIC_ROOT, PUBLIC_REFERENCE_ROOT);

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    path.basename(PUBLIC_REFERENCE_ROOT) !== "comic-reference"
  ) {
    throw new Error(`Refusing to sync comic references into unsafe path: ${PUBLIC_REFERENCE_ROOT}`);
  }
}

async function listImageFiles(root: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        return listImageFiles(absolutePath);
      }

      return entry.isFile() && isSupportedImage(entry.name) ? [absolutePath] : [];
    })
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

function addRecordToManifest(manifest: ComicReferenceManifest, record: ComicChapterSceneReferenceRecord) {
  const parts = record.relativePath.split("/");
  const characterMatch =
    parts.length >= 4 && parts[0] === "comic" && parts[1] === "characters" && parts[3] === "refs";
  const sceneMatch =
    parts.length >= 4 && parts[0] === "comic" && parts[1] === "scenes" && parts[3] === "refs";
  const chapterSceneMatch =
    parts.length >= 6 &&
    parts[0] === "comic" &&
    parts[1] === "seasons" &&
    parts[3]?.startsWith("chapter-") &&
    parts[4] === "scene-refs";

  if (characterMatch) {
    const slug = parts[2];
    manifest.characters[slug] = [...(manifest.characters[slug] || []), record];
    return;
  }

  if (sceneMatch) {
    const slug = parts[2];
    manifest.scenes[slug] = [...(manifest.scenes[slug] || []), record];
    return;
  }

  if (chapterSceneMatch) {
    const seasonSlug = parts[2];
    const chapterSlug = parts[3];
    const key = `${seasonSlug}/${chapterSlug}`;
    const folder = `comic/seasons/${seasonSlug}/${chapterSlug}/scene-refs`;
    const sceneSlug = buildChapterSceneSlug(seasonSlug, chapterSlug, record.label);

    manifest.chapters[key] = {
      folder,
      references: [...(manifest.chapters[key]?.references || []), record]
    };

    if (sceneSlug) {
      manifest.scenes[sceneSlug] = [...(manifest.scenes[sceneSlug] || []), record];
    }
  }
}

function sortManifest(manifest: ComicReferenceManifest) {
  const sortRecords = (records: ComicChapterSceneReferenceRecord[]) =>
    [...records].sort((left, right) => left.fileName.localeCompare(right.fileName));

  return {
    generatedAt: manifest.generatedAt,
    characters: Object.fromEntries(
      Object.entries(manifest.characters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slug, records]) => [slug, sortRecords(records)])
    ),
    scenes: Object.fromEntries(
      Object.entries(manifest.scenes)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slug, records]) => [slug, sortRecords(records)])
    ),
    chapters: Object.fromEntries(
      Object.entries(manifest.chapters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [
          key,
          {
            folder: entry.folder,
            references: sortRecords(entry.references)
          }
        ])
    )
  };
}

async function syncPublicReferenceFiles(imageFiles: string[]) {
  assertSafeGeneratedReferenceRoot();
  await rm(PUBLIC_REFERENCE_ROOT, { recursive: true, force: true });

  return Promise.all(
    imageFiles.map(async (absolutePath) => {
      const relativePath = path.relative(WORKSPACE_ROOT, absolutePath);
      const compressed = await compressComicReferenceImage({
        data: await readFile(absolutePath),
        fileName: path.basename(absolutePath),
        bucket: getReferenceBucketFromRelativePath(relativePath)
      });
      const compressedRelativePath = toCompressedReferenceRelativePath(
        relativePath,
        compressed.extension
      );
      const targetPath = path.join(PUBLIC_REFERENCE_ROOT, compressedRelativePath);

      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, compressed.buffer);

      return compressedRelativePath;
    })
  );
}

async function writeManifest(manifest: ComicReferenceManifest) {
  const existingManifest = await readExistingManifest();
  const generatedAt =
    existingManifest &&
    JSON.stringify(stripGeneratedAt(existingManifest)) === JSON.stringify(stripGeneratedAt(manifest))
      ? existingManifest.generatedAt
      : new Date().toISOString();
  const nextManifest = {
    ...manifest,
    generatedAt
  };

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

async function main() {
  const imageFiles = await listImageFiles(COMIC_ROOT);
  const manifest = createEmptyManifest();
  const syncedReferencePaths = await syncPublicReferenceFiles(imageFiles);

  for (const relativePath of syncedReferencePaths) {
    addRecordToManifest(manifest, toReferenceRecord(relativePath));
  }

  const sortedManifest = sortManifest(manifest);
  await writeManifest(sortedManifest);

  console.log(
    `Synced ${imageFiles.length} comic reference image${imageFiles.length === 1 ? "" : "s"} to public/comic-reference.`
  );
}

main().catch((error) => {
  console.error("Comic reference asset sync failed.");
  console.error(error);
  process.exitCode = 1;
});
