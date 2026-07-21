import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { buildAdminReviewUploadTemplate } from "@/lib/review-upload";

export async function GET() {
  const authenticated = await isFullAdminAuthenticated();

  if (!authenticated) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return new NextResponse(buildAdminReviewUploadTemplate(), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="product-review-upload-template.csv"',
      "Cache-Control": "private, no-store"
    }
  });
}
