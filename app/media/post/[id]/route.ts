import { Buffer } from "node:buffer";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { toAbsoluteUrl, defaultOgImage } from "@/lib/seo";
import { prisma } from "@/lib/db";

type PostMediaRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const POST_IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

const getPostImageAsset = unstable_cache(
  async (id: string) => {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        coverImageData: true,
        coverImageMimeType: true
      }
    });

    if (!post?.coverImageData) {
      return null;
    }

    return {
      coverImageData: post.coverImageData,
      coverImageMimeType: post.coverImageMimeType || "image/png"
    };
  },
  ["post-image-asset"],
  { revalidate: POST_IMAGE_REVALIDATE_SECONDS }
);

function isTransientPostImageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Timed out fetching a new connection from the connection pool") ||
    message.includes("Can't reach database server") ||
    message.includes("PrismaClientInitializationError")
  );
}

export async function GET(_: Request, { params }: PostMediaRouteProps) {
  const { id } = await params;

  try {
    const postImage = await getPostImageAsset(id);

    if (!postImage?.coverImageData) {
      return new NextResponse("Image not found.", { status: 404 });
    }

    const file = Buffer.from(postImage.coverImageData, "base64");

    return new NextResponse(file, {
      headers: {
        "Content-Type": postImage.coverImageMimeType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    if (isTransientPostImageError(error)) {
      return NextResponse.redirect(toAbsoluteUrl(defaultOgImage.url), 307);
    }

    throw error;
  }
}
