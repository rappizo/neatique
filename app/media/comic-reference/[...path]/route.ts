import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { readComicReferenceImage } from "@/lib/comic-reference-images";

type ComicReferenceMediaRouteProps = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: Request, { params }: ComicReferenceMediaRouteProps) {
  const { path } = await params;
  const image = await readComicReferenceImage(path.join("/"));

  if (!image) {
    return new NextResponse("Comic reference image not found.", { status: 404 });
  }

  return new NextResponse(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}

