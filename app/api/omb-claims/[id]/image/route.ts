import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type ImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ImageRouteProps) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const claim = await prisma.ombClaim.findUnique({
    where: { id },
    select: {
      screenshotBase64: true,
      screenshotMimeType: true
    }
  });

  if (!claim?.screenshotBase64 || !claim.screenshotMimeType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = Buffer.from(claim.screenshotBase64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": claim.screenshotMimeType,
      "Cache-Control": "private, no-store"
    }
  });
}
