import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { enqueueComicAiTask } from "@/lib/comic-ai-task-queue";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(request: Request) {
  const authenticated = await isFullAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized",
        message: "Admin login is required."
      },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-request",
        message: "Request body must be valid JSON."
      },
      { status: 400 }
    );
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const episodeId = typeof payload.episodeId === "string" ? payload.episodeId.trim() : "";
  const pageNumber =
    typeof payload.pageNumber === "number"
      ? payload.pageNumber
      : Number.parseInt(typeof payload.pageNumber === "string" ? payload.pageNumber : "", 10);

  if (!episodeId || !Number.isFinite(pageNumber)) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-page-request",
        message: "Episode and page number are required."
      },
      { status: 400 }
    );
  }

  const task = await enqueueComicAiTask({
    taskType: "generate",
    label: pageNumber === 0 ? "Cover" : `Page ${String(pageNumber).padStart(2, "0")}`,
    payload: {
      episodeId,
      pageNumber,
      referenceImages: Array.isArray(payload.referenceImages) ? payload.referenceImages : undefined
    }
  });

  return NextResponse.json({
    ok: true,
    status: "page-image-queued",
    message: "Comic page image generation was added to Comic tasks.",
    task
  });
}
