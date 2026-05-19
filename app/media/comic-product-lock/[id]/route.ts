import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type ComicProductLockMediaRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: ComicProductLockMediaRouteProps) {
  if (!(await isFullAdminAuthenticated())) {
    return new NextResponse("Comic product lock image not found.", { status: 404 });
  }

  const { id } = await params;
  const lock = await prisma.comicProductLock.findUnique({
    where: {
      id
    },
    select: {
      imageUrl: true,
      imageData: true,
      imageMimeType: true
    }
  });

  if (!lock?.imageData) {
    if (lock?.imageUrl && /^https?:\/\//i.test(lock.imageUrl)) {
      return NextResponse.redirect(lock.imageUrl, 307);
    }

    return new NextResponse("Comic product lock image not found.", { status: 404 });
  }

  return new NextResponse(Buffer.from(lock.imageData, "base64"), {
    headers: {
      "Content-Type": lock.imageMimeType || "image/png",
      "Cache-Control": "private, no-store"
    }
  });
}
