import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

type SiteMediaRouteProps = {
  params: Promise<{
    folder: string;
    file: string;
  }>;
};

export async function GET(_: Request, { params }: SiteMediaRouteProps) {
  const resolved = await params;
  const root = path.join(process.cwd(), "images");
  const targetPath = path.normalize(path.join(root, resolved.folder, resolved.file));

  if (!targetPath.startsWith(root)) {
    return new NextResponse("Invalid path.", { status: 400 });
  }

  try {
    const file = await readFile(targetPath);
    const extension = path.extname(targetPath).toLowerCase();

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return new NextResponse("File not found.", { status: 404 });
  }
}
