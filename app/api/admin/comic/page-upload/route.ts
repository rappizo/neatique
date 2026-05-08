import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ComicPageUploadInputError,
  uploadComicPageAsset
} from "@/lib/comic-page-upload";
import { toBool, toInt, toPlainString } from "@/lib/utils";

export const runtime = "nodejs";

function extractFile(formData: FormData, key: string) {
  const file = formData.get(key);
  return file instanceof File ? file : null;
}

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

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid-request",
        message: "Request body must be multipart form data."
      },
      { status: 400 }
    );
  }

  try {
    const result = await uploadComicPageAsset({
      episodeId: toPlainString(formData.get("episodeId")),
      pageNumber: toInt(formData.get("pageNumber"), -1),
      file: extractFile(formData, "comicPageFile"),
      approveAfterUpload: toBool(formData.get("approveAfterUpload")),
      title: toPlainString(formData.get("title")),
      altText: toPlainString(formData.get("altText")),
      caption: toPlainString(formData.get("caption")) || null
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ComicPageUploadInputError) {
      return NextResponse.json(
        {
          ok: false,
          status: error.status,
          message: error.message
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "page-upload-failed",
        message: error instanceof Error ? error.message : "Unknown comic page upload error."
      },
      { status: 500 }
    );
  }
}
