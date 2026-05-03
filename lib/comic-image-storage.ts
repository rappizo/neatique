import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

export type StoredComicImage = {
  imageUrl: string;
  imageData: string | null;
  imageMimeType: string;
  imageStorageKey: string | null;
  imageByteSize: number;
  imageSha256: string;
};

export type ComicImageSource = {
  mimeType: string;
  base64Data: string;
  fileName: string;
};

const COMIC_BLOB_CACHE_MAX_AGE = 60 * 60 * 24 * 365;

function getComicBlobToken() {
  return (
    process.env.comic_READ_WRITE_TOKEN ||
    process.env.COMIC_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    ""
  ).trim();
}

export function getComicImageExtension(mimeType: string | null | undefined) {
  const normalized = (mimeType || "").toLowerCase();

  if (normalized.includes("jpeg") || normalized.includes("jpg")) {
    return "jpg";
  }

  if (normalized.includes("webp")) {
    return "webp";
  }

  if (normalized.includes("avif")) {
    return "avif";
  }

  return "png";
}

function sanitizeBlobSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "comic"
  );
}

function buildComicBlobPath(input: {
  category: string;
  targetId: string;
  fileName?: string;
  mimeType: string;
}) {
  const extension = getComicImageExtension(input.mimeType);
  const fileBase = input.fileName
    ? sanitizeBlobSegment(input.fileName.replace(/\.[a-z0-9]+$/i, ""))
    : `${Date.now()}-${randomUUID()}`;

  return [
    "comic",
    sanitizeBlobSegment(input.category),
    sanitizeBlobSegment(input.targetId),
    `${fileBase}.${extension}`
  ].join("/");
}

export function buildComicMediaFallbackUrl(assetId: string) {
  return `/media/comic/${assetId}?v=${Date.now()}`;
}

export async function storeComicImage(input: {
  base64Data: string;
  mimeType: string;
  category: string;
  targetId: string;
  fileName?: string;
}): Promise<StoredComicImage> {
  const imageMimeType = input.mimeType || "image/png";
  const buffer = Buffer.from(input.base64Data, "base64");
  const imageSha256 = createHash("sha256").update(buffer).digest("hex");
  const token = getComicBlobToken();

  if (!token) {
    return {
      imageUrl: "/media/comic/pending",
      imageData: input.base64Data,
      imageMimeType,
      imageStorageKey: null,
      imageByteSize: buffer.length,
      imageSha256
    };
  }

  const pathname = buildComicBlobPath({
    category: input.category,
    targetId: input.targetId,
    fileName: input.fileName,
    mimeType: imageMimeType
  });
  const blob = await put(pathname, buffer, {
    access: "public",
    token,
    contentType: imageMimeType,
    cacheControlMaxAge: COMIC_BLOB_CACHE_MAX_AGE,
    addRandomSuffix: false
  });

  return {
    imageUrl: blob.url,
    imageData: null,
    imageMimeType,
    imageStorageKey: blob.pathname,
    imageByteSize: buffer.length,
    imageSha256
  };
}

export async function getComicImageSource(input: {
  id: string;
  imageData?: string | null;
  imageUrl?: string | null;
  imageMimeType?: string | null;
}): Promise<ComicImageSource | null> {
  const mimeType = input.imageMimeType || "image/png";

  if (input.imageData) {
    return {
      mimeType,
      base64Data: input.imageData,
      fileName: `${input.id}.${getComicImageExtension(mimeType)}`
    };
  }

  if (!input.imageUrl || !/^https?:\/\//i.test(input.imageUrl)) {
    return null;
  }

  const response = await fetch(input.imageUrl);

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") || mimeType;
  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType: contentType,
    base64Data: Buffer.from(arrayBuffer).toString("base64"),
    fileName: `${input.id}.${getComicImageExtension(contentType)}`
  };
}
