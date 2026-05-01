import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  createComicEpisodeDownloadZip,
  parseComicDownloadLanguage
} from "@/lib/comic-episode-download";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const episodeId = url.searchParams.get("episodeId")?.trim();
  const language = parseComicDownloadLanguage(url.searchParams.get("language"));

  if (!episodeId) {
    return NextResponse.json({ error: "Missing episode id." }, { status: 400 });
  }

  const result = await createComicEpisodeDownloadZip({
    episodeId,
    language,
    requirePublished: false
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
