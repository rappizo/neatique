import { NextResponse } from "next/server";
import { runComicAiTaskQueue } from "@/lib/comic-ai-task-queue";

export const runtime = "nodejs";
export const maxDuration = 120;

function isAuthorized(request: Request) {
  const secret = (process.env.CRON_SECRET || "").trim();

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized"
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "1", 10);
  const result = await runComicAiTaskQueue({
    limit: Number.isFinite(requestedLimit) ? requestedLimit : 1
  });

  return NextResponse.json(result);
}
