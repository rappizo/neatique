import { Buffer } from "node:buffer";
import sharp from "sharp";

export type ComicReferenceCompressionBucket = "character" | "scene" | "chapter-scene" | "unknown";

export type CompressedComicReferenceImage = {
  buffer: Buffer;
  extension: ".png" | ".jpg";
  mimeType: "image/png" | "image/jpeg";
};

const DEFAULT_CHARACTER_REFERENCE_MAX_DIMENSION = 1600;
const DEFAULT_SCENE_REFERENCE_MAX_DIMENSION = 1400;
const DEFAULT_REFERENCE_PNG_QUALITY = 78;
const DEFAULT_REFERENCE_JPEG_QUALITY = 68;

function getIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number.parseInt(process.env[name] || "", 10);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function getReferenceMaxDimension(bucket: ComicReferenceCompressionBucket) {
  if (bucket === "character") {
    return getIntegerEnv(
      "COMIC_REFERENCE_CHARACTER_MAX_DIMENSION",
      DEFAULT_CHARACTER_REFERENCE_MAX_DIMENSION,
      900,
      2200
    );
  }

  return getIntegerEnv(
    "COMIC_REFERENCE_SCENE_MAX_DIMENSION",
    DEFAULT_SCENE_REFERENCE_MAX_DIMENSION,
    900,
    2200
  );
}

function getReferencePngQuality() {
  return getIntegerEnv("COMIC_REFERENCE_PNG_QUALITY", DEFAULT_REFERENCE_PNG_QUALITY, 40, 100);
}

function getReferenceJpegQuality() {
  return getIntegerEnv("COMIC_REFERENCE_JPEG_QUALITY", DEFAULT_REFERENCE_JPEG_QUALITY, 40, 90);
}

function getOutputExtension(input: { fileName?: string | null; mimeType?: string | null }) {
  const normalizedMimeType = (input.mimeType || "").toLowerCase();
  const normalizedFileName = (input.fileName || "").toLowerCase();

  if (normalizedMimeType.includes("jpeg") || normalizedMimeType.includes("jpg")) {
    return ".jpg" as const;
  }

  if (normalizedFileName.endsWith(".jpg") || normalizedFileName.endsWith(".jpeg")) {
    return ".jpg" as const;
  }

  return ".png" as const;
}

function toBuffer(data: Buffer | Uint8Array | ArrayBuffer) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  return Buffer.from(data);
}

export function getCompressedComicReferenceMimeType(extension: ".png" | ".jpg") {
  return extension === ".jpg" ? "image/jpeg" : "image/png";
}

export function getCompressedComicReferenceFileName(
  fileName: string,
  extension: ".png" | ".jpg"
) {
  return fileName.replace(/\.[a-z0-9]+$/i, "") + extension;
}

export async function compressComicReferenceImage(input: {
  data: Buffer | Uint8Array | ArrayBuffer;
  fileName?: string | null;
  mimeType?: string | null;
  bucket?: ComicReferenceCompressionBucket;
}): Promise<CompressedComicReferenceImage> {
  const sourceBuffer = toBuffer(input.data);
  const bucket = input.bucket || "unknown";
  const extension = getOutputExtension(input);
  const maxDimension = getReferenceMaxDimension(bucket);
  const pipeline = sharp(sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true
    });

  const buffer =
    extension === ".jpg"
      ? await pipeline
          .flatten({ background: "#ffffff" })
          .jpeg({
            quality: getReferenceJpegQuality(),
            mozjpeg: true
          })
          .toBuffer()
      : await pipeline
          .png({
            compressionLevel: 9,
            palette: true,
            quality: getReferencePngQuality()
          })
          .toBuffer();

  return {
    buffer,
    extension,
    mimeType: getCompressedComicReferenceMimeType(extension)
  };
}
