import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { buildComicMediaFallbackUrl, storeComicImage } from "@/lib/comic-image-storage";
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

export type ComicImageCreationTaskResult = {
  ok: boolean;
  message: string;
  errorMessage?: string;
  creationId?: string;
  imageUrl?: string;
};

const COMIC_IMAGE_CREATION_PROMPT_MAX_LENGTH = 8000;

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

export function getComicImageCreationAspectRatioValue(aspectRatio: string) {
  const [width, height] = normalizeComicImageCreationAspectRatio(aspectRatio)
    .split(":")
    .map((item) => Number.parseInt(item, 10));

  return `${width} / ${height}`;
}

function normalizePrompt(value?: string | null) {
  return (value || "").trim().slice(0, COMIC_IMAGE_CREATION_PROMPT_MAX_LENGTH);
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
  attempt?: number;
}): Promise<ComicImageCreationTaskResult> {
  const prompt = normalizePrompt(input.prompt);
  const aspectRatio = normalizeComicImageCreationAspectRatio(input.aspectRatio);

  if (!prompt) {
    return {
      ok: false,
      message: "Image creation failed.",
      errorMessage: "Image prompt is required."
    };
  }

  try {
    const creationId = randomUUID();
    const image = await generateStandaloneComicImageWithAi({
      prompt,
      aspectRatio,
      generationAttempt: input.attempt
    });
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
      : buildComicMediaFallbackUrl(creationId).replace("/media/comic/", "/media/comic-creation/");

    await prisma.comicImageCreation.create({
      data: {
        id: creationId,
        prompt,
        aspectRatio,
        model: getOpenAiComicSettings().imageModel,
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
      message: "Image created.",
      creationId,
      imageUrl
    };
  } catch (error) {
    return {
      ok: false,
      message: "Image creation failed.",
      errorMessage: error instanceof Error ? error.message : "Unknown image creation error."
    };
  }
}
