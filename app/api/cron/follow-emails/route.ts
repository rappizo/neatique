import { NextResponse } from "next/server";
import { runFollowEmailAutomation } from "@/lib/follow-email-automation";

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
  // Vercel cron jobs call this endpoint with the shared bearer secret.
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized"
      },
      { status: 401 }
    );
  }

  const result = await runFollowEmailAutomation();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500
  });
}
