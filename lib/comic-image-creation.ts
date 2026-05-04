import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  buildComicMediaFallbackUrl,
  getComicImageSource,
  storeComicImage,
  type ComicImageSource
} from "@/lib/comic-image-storage";
import {
  generateStandaloneComicImageWithAi,
  getOpenAiComicSettings
} from "@/lib/openai-comic";

export const COMIC_IMAGE_CREATION_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9"
] as const;

export type ComicImageCreationAspectRatio = (typeof COMIC_IMAGE_CREATION_ASPECT_RATIOS)[number];

export const COMIC_IMAGE_CREATION_QUALITIES = ["high", "medium", "low"] as const;

export type ComicImageCreationQuality = (typeof COMIC_IMAGE_CREATION_QUALITIES)[number];

export type ComicImageCreationTaskResult = {
  ok: boolean;
  message: string;
  errorMessage?: string;
  creationId?: string;
  imageUrl?: string;
  quality?: ComicImageCreationQuality;
};

const COMIC_IMAGE_CREATION_PROMPT_MAX_LENGTH = 8000;
const COMIC_IMAGE_CREATION_REFERENCE_MAX_BYTES = 8 * 1024 * 1024;

type ComicImageCreationReferenceImageInput = {
  base64Data?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

export function normalizeComicImageCreationAspectRatio(
  value?: string | null
): ComicImageCreationAspectRatio {
  const normalized = (value || "").trim();

  return COMIC_IMAGE_CREATION_ASPECT_RATIOS.includes(
    normalized as ComicImageCreationAspectRatio
  )
    ? (normalized as ComicImageCreationAspectRatio)
    : "1:1";
}

export function normalizeComicImageCreationQuality(
  value?: string | null
): ComicImageCreationQuality {
  const normalized = (value || "").trim().toLowerCase();
  const canonical = normalized === "mediem" ? "medium" : normalized;

  return COMIC_IMAGE_CREATION_QUALITIES.includes(canonical as ComicImageCreationQuality)
    ? (canonical as ComicImageCreationQuality)
    : "medium";
}

export function getComicImageCreationQualityLabel(value?: string | null) {
  const quality = normalizeComicImageCreationQuality(value);

  switch (quality) {
    case "high":
      return "High";
    case "low":
      return "Low";
    case "medium":
    default:
      return "Medium";
  }
}

export function getComicImageCreationAspectRatioValue(aspectRatio: string) {
  const [width, height] = normalizeComicImageCreationAspectRatio(aspectRatio)
    .split(":")
    .map((item) => Number.parseInt(item, 10));

  return `${width} / ${height}`;
}

function normalizePrompt(value?: string | null) {
  return (value || "").trim().slice(0, COMIC_IMAGE_CREATION_PROMPT_MAX_LENGTH);
}

function normalizeReferenceImage(
  value?: ComicImageCreationReferenceImageInput | null
): ComicImageSource | null {
  const base64Data = (value?.base64Data || "").trim();
  const mimeType = (value?.mimeType || "").trim() || "image/jpeg";
  const fileName = (value?.fileName || "reference.jpg").trim().slice(0, 160) || "reference.jpg";

  if (!base64Data) {
    return null;
  }

  if (!mimeType.toLowerCase().startsWith("image/")) {
    throw new Error("Reference upload must be an image file.");
  }

  const byteLength = Buffer.byteLength(base64Data, "base64");
  if (byteLength > COMIC_IMAGE_CREATION_REFERENCE_MAX_BYTES) {
    throw new Error("Reference image is too large. Upload an image under 8 MB after compression.");
  }

  return {
    mimeType,
    base64Data,
    fileName
  };
}

function buildComicImageCreationFallbackUrl(creationId: string, kind?: "reference") {
  const url = buildComicMediaFallbackUrl(creationId).replace(
    "/media/comic/",
    "/media/comic-creation/"
  );

  return kind === "reference" ? `${url}&kind=reference` : url;
}

export async function listComicImageCreations(limit = 24) {
  return prisma.comicImageCreation.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 60)
  });
}

export async function generateComicImageCreation(input: {
  prompt: string;
  aspectRatio: string;
  quality?: string;
  referenceCreationId?: string;
  referenceImage?: ComicImageCreationReferenceImageInput | null;
  attempt?: number;
}): Promise<ComicImageCreationTaskResult> {
  const prompt = normalizePrompt(input.prompt);
  const aspectRatio = normalizeComicImageCreationAspectRatio(input.aspectRatio);
  const quality = normalizeComicImageCreationQuality(input.quality);
  const referenceCreationId = (input.referenceCreationId || "").trim();

  if (!prompt) {
    return {
      ok: false,
      message: "Image creation failed.",
      errorMessage: "Image prompt is required."
    };
  }

  try {
    const creationId = randomUUID();
    const uploadedReferenceImage = normalizeReferenceImage(input.referenceImage);
    let referenceImage: ComicImageSource | null = uploadedReferenceImage;
    let sourceType = uploadedReferenceImage ? "UPLOAD" : "TEXT";
    let referenceImageUrl: string | null = null;
    let referenceImageData: string | null = null;
    let referenceImageMimeType: string | null = uploadedReferenceImage?.mimeType || null;
    let referenceImageStorageKey: string | null = null;
    let referenceImageByteSize: number | null = null;
    let referenceImageSha256: string | null = null;
    let referenceImageName: string | null = uploadedReferenceImage?.fileName || null;

    if (!referenceImage && referenceCreationId) {
      const referenceCreation = await prisma.comicImageCreation.findUnique({
        where: { id: referenceCreationId },
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          imageData: true,
          imageMimeType: true
        }
      });

      if (!referenceCreation) {
        return {
          ok: false,
          message: "Image creation failed.",
          errorMessage: "Selected reference image no longer exists."
        };
      }

      referenceImage = await getComicImageSource(referenceCreation);

      if (!referenceImage) {
        return {
          ok: false,
          message: "Image creation failed.",
          errorMessage: "Selected reference image could not be loaded."
        };
      }

      sourceType = "CREATION";
      referenceImageUrl = referenceCreation.imageUrl;
      referenceImageMimeType = referenceCreation.imageMimeType || referenceImage.mimeType;
      referenceImageName = referenceCreation.prompt.slice(0, 140);
    }

    const image = await generateStandaloneComicImageWithAi({
      prompt,
      aspectRatio,
      quality,
      referenceImage,
      generationAttempt: input.attempt
    });

    if (uploadedReferenceImage) {
      const storedReference = await storeComicImage({
        base64Data: uploadedReferenceImage.base64Data,
        mimeType: uploadedReferenceImage.mimeType,
        category: "image-creation-references",
        targetId: creationId,
        fileName: `reference-${Date.now()}`
      });
      const hasPublicStoredReferenceUrl =
        Boolean(storedReference.imageStorageKey) || /^https?:\/\//i.test(storedReference.imageUrl);

      referenceImageUrl = hasPublicStoredReferenceUrl
        ? storedReference.imageUrl
        : buildComicImageCreationFallbackUrl(creationId, "reference");
      referenceImageData = storedReference.imageData;
      referenceImageMimeType = storedReference.imageMimeType;
      referenceImageStorageKey = storedReference.imageStorageKey;
      referenceImageByteSize = storedReference.imageByteSize;
      referenceImageSha256 = storedReference.imageSha256;
    }

    const storedImage = await storeComicImage({
      base64Data: image.base64Data,
      mimeType: image.mimeType,
      category: "image-creation",
      targetId: creationId,
      fileName: `image-${Date.now()}`
    });
    const hasPublicStoredUrl =
      Boolean(storedImage.imageStorageKey) || /^https?:\/\//i.test(storedImage.imageUrl);
    const imageUrl = hasPublicStoredUrl
      ? storedImage.imageUrl
      : buildComicImageCreationFallbackUrl(creationId);

    await prisma.comicImageCreation.create({
      data: {
        id: creationId,
        prompt,
        aspectRatio,
        quality,
        model: getOpenAiComicSettings().imageModel,
        sourceType,
        referenceCreationId: sourceType === "CREATION" ? referenceCreationId : null,
        referenceImageUrl,
        referenceImageData,
        referenceImageMimeType,
        referenceImageStorageKey,
        referenceImageByteSize,
        referenceImageSha256,
        referenceImageName,
        imageUrl,
        imageData: storedImage.imageData,
        imageMimeType: storedImage.imageMimeType,
        imageStorageKey: storedImage.imageStorageKey,
        imageByteSize: storedImage.imageByteSize,
        imageSha256: storedImage.imageSha256
      }
    });

    revalidatePath("/admin/comic/image-creation");

    return {
      ok: true,
      message: referenceImage ? "Image created from reference." : "Image created.",
      creationId,
      imageUrl,
      quality
    };
  } catch (error) {
    return {
      ok: false,
      message: "Image creation failed.",
      errorMessage: error instanceof Error ? error.message : "Unknown image creation error."
    };
  }
}

export async function deleteComicImageCreation(id: string) {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return false;
  }

  await prisma.comicImageCreation.deleteMany({
    where: { id: normalizedId }
  });
  revalidatePath("/admin/comic/image-creation");

  return true;
}
