import { put } from "@vercel/blob";

export const PUBLIC_BLOB_CACHE_MAX_AGE = 60 * 60 * 24 * 365;

export function getVercelBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.COMIC_READ_WRITE_TOKEN ||
    process.env.comic_READ_WRITE_TOKEN ||
    ""
  ).trim();
}

export function getImageExtension(mimeType: string | null | undefined) {
  const normalized = (mimeType || "").toLowerCase();

  if (normalized.includes("svg")) {
    return "svg";
  }

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

export function sanitizeBlobSegment(value: string) {
  return (
    value
      .trim()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "asset"
  );
}

export async function putPublicBlob(input: {
  pathname: string;
  body: Buffer;
  contentType: string;
  token?: string;
}) {
  const token = input.token ?? getVercelBlobToken();

  if (!token) {
    return null;
  }

  return put(input.pathname, input.body, {
    access: "public",
    token,
    contentType: input.contentType,
    cacheControlMaxAge: PUBLIC_BLOB_CACHE_MAX_AGE,
    addRandomSuffix: false,
    allowOverwrite: true
  });
}
