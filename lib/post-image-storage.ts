import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  getImageExtension,
  putPublicBlob,
  sanitizeBlobSegment
} from "@/lib/vercel-blob-storage";

export type StoredPostCoverImage = {
  coverImageUrl: string;
  coverImageData: string | null;
  coverImageMimeType: string;
};

export async function storePostCoverImage(input: {
  postId: string;
  slug?: string | null;
  title?: string | null;
  base64Data: string;
  mimeType: string;
  timestamp?: number;
}): Promise<StoredPostCoverImage> {
  const coverImageMimeType = input.mimeType || "image/png";
  const buffer = Buffer.from(input.base64Data, "base64");
  const sha = createHash("sha256").update(buffer).digest("hex");
  const extension = getImageExtension(coverImageMimeType);
  const fileBase = sanitizeBlobSegment(input.slug || input.title || input.postId);
  const pathname = [
    "post-covers",
    sanitizeBlobSegment(input.postId),
    `${fileBase}-${sha.slice(0, 12)}.${extension}`
  ].join("/");
  const blob = await putPublicBlob({
    pathname,
    body: buffer,
    contentType: coverImageMimeType
  });

  if (!blob) {
    return {
      coverImageUrl: `/media/post/${input.postId}?v=${input.timestamp ?? Date.now()}`,
      coverImageData: input.base64Data,
      coverImageMimeType
    };
  }

  return {
    coverImageUrl: blob.url,
    coverImageData: null,
    coverImageMimeType
  };
}
