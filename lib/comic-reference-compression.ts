import { Buffer } from "node:buffer";
import sharp from "sharp";

export type ComicReferenceCompressionBucket = "character" | "scene" | "chapter-scene" | "unknown";

export type CompressedComicReferenceImage = {
  buffer: Buffer;
  extension: ".jpg";
  mimeType: "image/jpeg";
};

const DEFAULT_CHARACTER_REFERENCE_MAX_DIMENSION = 1600;
const DEFAULT_SCENE_REFERENCE_MAX_DIMENSION = 1400;
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

function getReferenceJpegQuality() {
  return getIntegerEnv("COMIC_REFERENCE_JPEG_QUALITY", DEFAULT_REFERENCE_JPEG_QUALITY, 40, 90);
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

export function getCompressedComicReferenceMimeType(): "image/jpeg" {
  return "image/jpeg";
}

export function getCompressedComicReferenceFileName(
  fileName: string,
  extension: ".jpg"
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
  const maxDimension = getReferenceMaxDimension(bucket);
  const pipeline = sharp(sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true
    });
  const buffer = await pipeline
    .flatten({ background: "#ffffff" })
    .jpeg({
      quality: getReferenceJpegQuality(),
      mozjpeg: true
    })
    .toBuffer();

  return {
    buffer,
    extension: ".jpg",
    mimeType: getCompressedComicReferenceMimeType()
  };
}
