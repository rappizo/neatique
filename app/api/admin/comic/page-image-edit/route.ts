import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicPageImageEditInputError,
  editComicPageImageForAsset
} from "@/lib/comic-page-image-edit";

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
  const editInstruction =
    typeof payload.editInstruction === "string" ? payload.editInstruction.trim() : "";

  try {
    const result = await editComicPageImageForAsset({
      assetId,
      editInstruction
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof ComicPageImageEditInputError) {
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
        status: "page-edit-failed",
        message: error instanceof Error ? error.message : "Unknown comic page image edit error."
      },
      { status: 500 }
    );
  }
}
