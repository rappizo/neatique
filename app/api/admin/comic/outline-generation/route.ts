import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicOutlineTaskInputError,
  runComicOutlineTask,
  type ComicOutlineTaskResult,
  type ComicOutlineTaskType
} from "@/lib/comic-outline-generation";
import { prisma } from "@/lib/db";

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
  "episode-translate"
]);

function isComicOutlineTaskType(value: string): value is ComicOutlineTaskType {
  return OUTLINE_TASK_TYPES.has(value as ComicOutlineTaskType);
}

function stringifyOutlineTaskPayload(input: {
  taskType: ComicOutlineTaskType;
  targetId: string;
  revisionNotes: string;
}) {
  return JSON.stringify({
    source: "outline-generation-route",
    taskType: input.taskType,
    targetId: input.targetId,
    revisionNotes: input.revisionNotes
  });
}

async function persistDirectOutlineTaskResult(input: {
  taskType: ComicOutlineTaskType;
  targetId: string;
  revisionNotes: string;
  result: ComicOutlineTaskResult;
}) {
  await prisma.comicAiTask.create({
    data: {
      taskType: "outline",
      label: `Direct outline ${input.taskType}`,
      status: input.result.ok ? "SUCCEEDED" : "FAILED",
      payload: stringifyOutlineTaskPayload(input),
      result: JSON.stringify(input.result),
      errorMessage: input.result.ok ? null : input.result.errorMessage || input.result.message,
      targetId: input.targetId || null,
      attempts: 1,
      maxAttempts: 1,
      completedAt: new Date()
    }
  });
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

  try {
    const result = await runComicOutlineTask({
      taskType,
      targetId,
      revisionNotes
    });

    await persistDirectOutlineTaskResult({
      taskType,
      targetId,
      revisionNotes,
      result
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof ComicOutlineTaskInputError) {
      return NextResponse.json(
        {
          ok: false,
          status: error.status,
          taskType,
          targetId,
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "outline-failed",
        taskType,
        targetId,
        message: error instanceof Error ? error.message : "Unknown comic outline task error."
      },
      { status: 500 }
    );
  }
}
