import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  enqueueComicAiTask,
  listComicAiTasks,
  type ComicAiTaskType
} from "@/lib/comic-ai-task-queue";

const COMIC_AI_TASK_TYPES = new Set<ComicAiTaskType>([
  "generate",
  "edit",
  "prompt-package",
  "prompt-revision",
  "outline",
  "character-lock-revision",
  "scene-lock-revision",
  "chinese-page-version",
  "image-creation"
]);

function isComicAiTaskType(value: string): value is ComicAiTaskType {
  return COMIC_AI_TASK_TYPES.has(value as ComicAiTaskType);
}

async function requireAdmin() {
  const authenticated = await isAdminAuthenticated();

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

  return null;
}

export async function GET(request: Request) {
  const unauthorizedResponse = await requireAdmin();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") || "40", 10);
  const tasks = await listComicAiTasks(Number.isFinite(limit) ? limit : 40);

  return NextResponse.json({
    ok: true,
    tasks
  });
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireAdmin();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
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
  const label = typeof payload.label === "string" ? payload.label.trim() : "";
  const taskPayload =
    payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : {};

  if (!isComicAiTaskType(taskType)) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-task-type",
        message: "Unsupported comic AI task type."
      },
      { status: 400 }
    );
  }

  const task = await enqueueComicAiTask({
    taskType,
    label,
    payload: taskPayload
  });

  return NextResponse.json({
    ok: true,
    task
  });
}
