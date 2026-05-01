import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicPromptGenerationInputError,
  reviseComicPagePromptForEpisode
} from "@/lib/comic-prompt-generation";

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
  const promptSuggestion =
    typeof payload.promptSuggestion === "string" ? payload.promptSuggestion.trim() : "";
  const pageNumber =
    typeof payload.pageNumber === "number"
      ? payload.pageNumber
      : Number.parseInt(typeof payload.pageNumber === "string" ? payload.pageNumber : "", 10);

  try {
    const result = await reviseComicPagePromptForEpisode({
      episodeId,
      pageNumber: Number.isFinite(pageNumber) ? pageNumber : 0,
      promptSuggestion
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    if (error instanceof ComicPromptGenerationInputError) {
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
        status: "page-prompt-revision-failed",
        message:
          error instanceof Error ? error.message : "Unknown comic page prompt revision error."
      },
      { status: 500 }
    );
  }
}
