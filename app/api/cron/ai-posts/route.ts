import { NextResponse } from "next/server";
import { runAiPostAutomation } from "@/lib/ai-post-automation";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const result = await runAiPostAutomation({
    trigger: "cron"
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500
  });
}
