import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { enqueueComicAiTask } from "@/lib/comic-ai-task-queue";

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

  if (!episodeId) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing-episode",
        message: "Episode is required."
      },
      { status: 400 }
    );
  }

  const task = await enqueueComicAiTask({
    taskType: "prompt-package",
    label: "Prompt package",
    payload: {
      episodeId
    }
  });

  return NextResponse.json({
    ok: true,
    status: "prompt-queued",
    message: "Prompt package generation was added to Comic tasks.",
    task
  });
}
