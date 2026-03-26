import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getProductImageRoot } from "@/lib/product-media";

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

type ProductMediaRouteProps = {
  params: Promise<{
    folder: string;
    file: string;
  }>;
};

export async function GET(_: Request, { params }: ProductMediaRouteProps) {
  const resolved = await params;
  const root = getProductImageRoot();
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
