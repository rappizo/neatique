import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicChinesePageVersionInputError,
  createChineseComicPageVersion
} from "@/lib/comic-chinese-page-version";

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
  const assetId = typeof payload.assetId === "string" ? payload.assetId.trim() : "";

  try {
    const result = await createChineseComicPageVersion({ assetId });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof ComicChinesePageVersionInputError) {
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
        status: "page-chinese-failed",
        message:
          error instanceof Error ? error.message : "Unknown Chinese comic page version error."
      },
      { status: 500 }
    );
  }
}
