import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  compressComicReferenceImage,
  getCompressedComicReferenceFileName,
  type ComicReferenceCompressionBucket
} from "@/lib/comic-reference-compression";

const WORKSPACE_ROOT = process.cwd();
const COMIC_ROOT = path.resolve(WORKSPACE_ROOT, "comic");
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

type CompressionResult = {
  sourcePath: string;
  targetPath: string;
  beforeBytes: number;
  afterBytes: number;
};

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

function getExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function isSupportedImage(fileName: string) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(getExtension(fileName));
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

function getCompressedTargetPath(sourcePath: string, extension: ".png" | ".jpg") {
  return path.join(
    path.dirname(sourcePath),
    getCompressedComicReferenceFileName(path.basename(sourcePath), extension)
  );
}

async function compressFile(sourcePath: string): Promise<CompressionResult> {
  const source = await readFile(sourcePath);
  const relativePath = path.relative(WORKSPACE_ROOT, sourcePath);
  const compressed = await compressComicReferenceImage({
    data: source,
    fileName: path.basename(sourcePath),
    bucket: getReferenceBucketFromRelativePath(relativePath)
  });
  const targetPath = getCompressedTargetPath(sourcePath, compressed.extension);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, compressed.buffer);

  if (targetPath !== sourcePath) {
    await rm(sourcePath, { force: true });
  }

  return {
    sourcePath,
    targetPath,
    beforeBytes: source.byteLength,
    afterBytes: compressed.buffer.byteLength
  };
}

async function main() {
  const imageFiles = await listImageFiles(COMIC_ROOT);
  const results = await Promise.all(imageFiles.map(compressFile));
  const beforeBytes = results.reduce((total, result) => total + result.beforeBytes, 0);
  const afterBytes = results.reduce((total, result) => total + result.afterBytes, 0);
  const savedBytes = beforeBytes - afterBytes;

  console.log(
    `Compressed ${results.length} comic reference image${results.length === 1 ? "" : "s"} from ${(beforeBytes / 1024 / 1024).toFixed(2)} MB to ${(afterBytes / 1024 / 1024).toFixed(2)} MB.`
  );

  if (savedBytes > 0) {
    console.log(`Saved ${(savedBytes / 1024 / 1024).toFixed(2)} MB.`);
  }
}

main().catch((error) => {
  console.error("Comic reference asset compression failed.");
  console.error(error);
  process.exitCode = 1;
});
