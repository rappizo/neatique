import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { runComicAiTaskQueue } from "@/lib/comic-ai-task-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
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

  let limit = 1;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const requestedLimit =
      typeof body.limit === "number"
        ? body.limit
        : Number.parseInt(typeof body.limit === "string" ? body.limit : "", 10);

    if (Number.isFinite(requestedLimit)) {
      limit = requestedLimit;
    }
  } catch {
    limit = 1;
  }

  const result = await runComicAiTaskQueue({
    limit
  });

  return NextResponse.json(result);
}
