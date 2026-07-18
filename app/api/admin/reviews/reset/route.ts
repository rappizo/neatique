import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function disabledResponse() {
  if (!(await isFullAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "Synthetic review resets are permanently disabled. Import only traceable, authentic customer feedback."
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "private, no-store"
      }
    }
  );
}

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}
