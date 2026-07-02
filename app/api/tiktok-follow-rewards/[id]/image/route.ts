import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type ImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ImageRouteProps) {
  const authenticated = await isFullAdminAuthenticated();

  if (!authenticated) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const reward = await prisma.tikTokFollowReward.findUnique({
    where: { id },
    select: {
      screenshotBase64: true,
      screenshotMimeType: true
    }
  });

  if (!reward?.screenshotBase64 || !reward.screenshotMimeType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = Buffer.from(reward.screenshotBase64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": reward.screenshotMimeType,
      "Cache-Control": "private, no-store"
    }
  });
}
