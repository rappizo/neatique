import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { cancelComicAiTask, retryComicAiTask } from "@/lib/comic-ai-task-queue";

type ComicAiTaskRouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, context: ComicAiTaskRouteContext) {
  const unauthorizedResponse = await requireAdmin();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
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
  const action = typeof payload.action === "string" ? payload.action.trim() : "";

  if (action === "cancel") {
    const task = await cancelComicAiTask(id);
    return NextResponse.json({
      ok: Boolean(task),
      task,
      message: task ? "Task cancelled." : "Task could not be found."
    });
  }

  if (action === "retry") {
    const task = await retryComicAiTask(id);
    return NextResponse.json({
      ok: Boolean(task),
      task,
      message: task ? "Task queued again." : "Task could not be found."
    });
  }

  return NextResponse.json(
    {
      ok: false,
      status: "invalid-action",
      message: "Unsupported task action."
    },
    { status: 400 }
  );
}
