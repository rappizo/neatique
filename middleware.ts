import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveSeoRoute } from "@/lib/seo-routing";

export function middleware(request: NextRequest) {
  const decision = resolveSeoRoute(request.nextUrl);

  if (decision?.type === "gone") {
    return new NextResponse(null, {
      status: 410,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }

  if (decision?.type === "redirect") {
    return NextResponse.redirect(decision.destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|admin|_next/static|_next/image|media/|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"
  ]
};
