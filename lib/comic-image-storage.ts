import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import {
  getImageExtension,
  getVercelBlobToken,
  putPublicBlob,
  sanitizeBlobSegment
} from "@/lib/vercel-blob-storage";

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

export function getComicImageExtension(mimeType: string | null | undefined) {
  return getImageExtension(mimeType);
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
  const token = getVercelBlobToken();

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
  const blob = await putPublicBlob({
    pathname,
    body: buffer,
    contentType: imageMimeType,
    token
  });

  if (!blob) {
    return {
      imageUrl: "/media/comic/pending",
      imageData: input.base64Data,
      imageMimeType,
      imageStorageKey: null,
      imageByteSize: buffer.length,
      imageSha256
    };
  }

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
