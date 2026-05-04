import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicPageImageGenerationInputError,
  generateComicPageImageForEpisode
} from "@/lib/comic-page-image-generation";

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
  const episodeId = typeof payload.episodeId === "string" ? payload.episodeId.trim() : "";
  const pageNumber =
    typeof payload.pageNumber === "number"
      ? payload.pageNumber
      : Number.parseInt(typeof payload.pageNumber === "string" ? payload.pageNumber : "", 10);

  try {
    const result = await generateComicPageImageForEpisode({
      episodeId,
      pageNumber: Number.isFinite(pageNumber) ? pageNumber : 0
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof ComicPageImageGenerationInputError) {
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
        status: "page-image-failed",
        message: error instanceof Error ? error.message : "Unknown comic page image generation error."
      },
      { status: 500 }
    );
  }
}
