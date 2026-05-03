import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicLockRevisionInputError,
  reviseComicCharacterLock
} from "@/lib/comic-lock-revision";

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
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const revisionInstruction =
    typeof payload.revisionInstruction === "string"
      ? payload.revisionInstruction.trim()
      : "";

  try {
    const result = await reviseComicCharacterLock({ id, revisionInstruction });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof ComicLockRevisionInputError) {
      return NextResponse.json(
        {
          ok: false,
          status: error.status,
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "lock-revision-failed",
        message:
          error instanceof Error ? error.message : "Unknown character lock revision error."
      },
      { status: 500 }
    );
  }
}
