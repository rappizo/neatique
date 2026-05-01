import { NextResponse } from "next/server";
import {
  createComicEpisodeDownloadZip,
  parseComicDownloadLanguage
} from "@/lib/comic-episode-download";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const episodeId = url.searchParams.get("episodeId")?.trim();
  const language = parseComicDownloadLanguage(url.searchParams.get("language"));

  if (!episodeId) {
    return NextResponse.json({ error: "Missing episode id." }, { status: 400 });
  }

  const result = await createComicEpisodeDownloadZip({
    episodeId,
    language,
    requirePublished: true
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(result.zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(result.zip.length),
      "Content-Disposition": `attachment; filename="${result.fileName}"`
    }
  });
}
