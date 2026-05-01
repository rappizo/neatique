import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicPromptGenerationInputError,
  generateComicPromptPackageForEpisode
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

  try {
    const result = await generateComicPromptPackageForEpisode({ episodeId });

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
        status: "prompt-failed",
        message: error instanceof Error ? error.message : "Unknown comic prompt generation error."
      },
      { status: 500 }
    );
  }
}
