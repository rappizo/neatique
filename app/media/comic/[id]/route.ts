import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { defaultOgImage, toAbsoluteUrl } from "@/lib/seo";
import { prisma } from "@/lib/db";

type ComicMediaRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getComicImageAsset(id: string) {
  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id },
    select: {
      imageUrl: true,
      imageData: true,
      imageMimeType: true,
      published: true,
      episode: {
        select: {
          published: true,
          chapter: {
            select: {
              published: true,
              season: {
                select: {
                  published: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!asset?.imageData && !asset?.imageUrl) {
    return null;
  }

  return {
    imageUrl: asset.imageUrl,
    imageData: asset.imageData,
    imageMimeType: asset.imageMimeType || "image/png",
    public: Boolean(
      asset.published &&
        asset.episode.published &&
        asset.episode.chapter.published &&
        asset.episode.chapter.season.published
    )
  };
}

function isTransientComicImageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Timed out fetching a new connection from the connection pool") ||
    message.includes("Can't reach database server") ||
    message.includes("PrismaClientInitializationError")
  );
}

export async function GET(_request: Request, { params }: ComicMediaRouteProps) {
  const { id } = await params;

  try {
    const image = await getComicImageAsset(id);

    if (image && !image.public && !(await isAdminAuthenticated())) {
      return new NextResponse("Comic image not found.", { status: 404 });
    }

    if (!image?.imageData) {
      if (image?.imageUrl && /^https?:\/\//i.test(image.imageUrl)) {
        return NextResponse.redirect(image.imageUrl, 307);
      }

      return new NextResponse("Comic image not found.", { status: 404 });
    }

    return new NextResponse(Buffer.from(image.imageData, "base64"), {
      headers: {
        "Content-Type": image.imageMimeType,
        "Cache-Control": image.public
          ? "public, max-age=31536000, immutable"
          : "private, no-store"
      }
    });
  } catch (error) {
    if (isTransientComicImageError(error)) {
      return NextResponse.redirect(toAbsoluteUrl(defaultOgImage.url), 307);
    }

    throw error;
  }
}
