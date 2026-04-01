import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type PostMediaRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: PostMediaRouteProps) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      coverImageData: true,
      coverImageMimeType: true
    }
  });

  if (!post?.coverImageData) {
    return new NextResponse("Image not found.", { status: 404 });
  }

  const file = Buffer.from(post.coverImageData, "base64");

  return new NextResponse(file, {
    headers: {
      "Content-Type": post.coverImageMimeType || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
