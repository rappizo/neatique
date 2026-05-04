import { Buffer } from "node:buffer";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { defaultOgImage, toAbsoluteUrl } from "@/lib/seo";
import { prisma } from "@/lib/db";

type ComicImageCreationMediaRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const COMIC_IMAGE_CREATION_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

const getComicImageCreation = unstable_cache(
  async (id: string) => {
    const image = await prisma.comicImageCreation.findUnique({
      where: { id },
      select: {
        imageUrl: true,
        imageData: true,
        imageMimeType: true,
        referenceImageUrl: true,
        referenceImageData: true,
        referenceImageMimeType: true
      }
    });

    if (!image?.imageData && !image?.imageUrl && !image?.referenceImageData && !image?.referenceImageUrl) {
      return null;
    }

    return {
      imageUrl: image.imageUrl,
      imageData: image.imageData,
      imageMimeType: image.imageMimeType || "image/png",
      referenceImageUrl: image.referenceImageUrl,
      referenceImageData: image.referenceImageData,
      referenceImageMimeType: image.referenceImageMimeType || "image/jpeg"
    };
  },
  ["comic-image-creation"],
  { revalidate: COMIC_IMAGE_CREATION_REVALIDATE_SECONDS }
);

function isTransientComicImageCreationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Timed out fetching a new connection from the connection pool") ||
    message.includes("Can't reach database server") ||
    message.includes("PrismaClientInitializationError")
  );
}

export async function GET(request: Request, { params }: ComicImageCreationMediaRouteProps) {
  const { id } = await params;
  const url = new URL(request.url);
  const useReferenceImage = url.searchParams.get("kind") === "reference";

  try {
    const image = await getComicImageCreation(id);
    const imageData = useReferenceImage ? image?.referenceImageData : image?.imageData;
    const imageUrl = useReferenceImage ? image?.referenceImageUrl : image?.imageUrl;
    const imageMimeType = useReferenceImage
      ? image?.referenceImageMimeType || "image/jpeg"
      : image?.imageMimeType || "image/png";

    if (!imageData) {
      if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
        return NextResponse.redirect(imageUrl, 307);
      }

      return new NextResponse("Comic image creation not found.", { status: 404 });
    }

    return new NextResponse(Buffer.from(imageData, "base64"), {
      headers: {
        "Content-Type": imageMimeType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    if (isTransientComicImageCreationError(error)) {
      return NextResponse.redirect(toAbsoluteUrl(defaultOgImage.url), 307);
    }

    throw error;
  }
}
