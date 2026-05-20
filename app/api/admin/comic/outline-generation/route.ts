import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { enqueueComicAiTask } from "@/lib/comic-ai-task-queue";
import type { ComicOutlineTaskType } from "@/lib/comic-outline-generation";

export const runtime = "nodejs";
export const maxDuration = 800;

const OUTLINE_TASK_TYPES = new Set<ComicOutlineTaskType>([
  "project-generate",
  "project-translate",
  "seasons-generate",
  "season-generate",
  "season-translate",
  "chapters-generate",
  "chapter-generate",
  "chapter-translate",
  "episodes-generate",
  "episode-generate",
  "episode-translate",
  "extra-story-generate"
]);

function isComicOutlineTaskType(value: string): value is ComicOutlineTaskType {
  return OUTLINE_TASK_TYPES.has(value as ComicOutlineTaskType);
}

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
  const taskType = typeof payload.taskType === "string" ? payload.taskType.trim() : "";
  const targetId = typeof payload.targetId === "string" ? payload.targetId.trim() : "";
  const revisionNotes =
    typeof payload.revisionNotes === "string" ? payload.revisionNotes.trim() : "";
  const userRequest = typeof payload.userRequest === "string" ? payload.userRequest.trim() : "";

  if (!isComicOutlineTaskType(taskType)) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-request",
        message: "Unsupported outline task type."
      },
      { status: 400 }
    );
  }

  const task = await enqueueComicAiTask({
    taskType: "outline",
    label: `Outline ${taskType}`,
    payload: {
      taskType,
      targetId,
      revisionNotes,
      userRequest
    }
  });

  return NextResponse.json({
    ok: true,
    status: "outline-queued",
    taskType,
    targetId,
    message: "Comic outline generation was added to Comic tasks.",
    task
  });
}
