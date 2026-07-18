import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  canMarkReviewAsVerified,
  getCompliantReviewStatus,
  isSyntheticReviewSource
} from "@/lib/review-compliance";
import type { ReviewStatus } from "@/lib/types";

function parseReviewStatus(value: string | undefined): ReviewStatus {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "PENDING" || normalized === "HIDDEN" || normalized === "PUBLISHED") {
    return normalized;
  }

  return "PUBLISHED";
}

function parseReviewDateInput(value: string | undefined | null) {
  const raw = (value || "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.length === 10 ? `${raw}T12:00:00.000Z` : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function refreshReviewPaths(productSlug: string) {
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${productSlug}`);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${productSlug}`);
}

export async function POST(request: Request) {
  if (!(await isFullAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      intent?: "update" | "approve" | "delete";
      id?: string;
      productSlug?: string;
      rating?: number;
      title?: string;
      content?: string;
      displayName?: string;
      reviewDate?: string;
      status?: string;
      verifiedPurchase?: boolean;
      incentivizedReview?: boolean;
      adminNotes?: string;
    };

    const id = (body.id || "").trim();
    const productSlug = (body.productSlug || "").trim();

    if (!id || !productSlug) {
      return NextResponse.json({ error: "Missing review id or product slug." }, { status: 400 });
    }

    if (body.intent === "delete") {
      await prisma.productReview.delete({
        where: { id }
      });

      refreshReviewPaths(productSlug);
      return NextResponse.json({ ok: true });
    }

    if (body.intent === "approve") {
      const existingReview = await prisma.productReview.findUnique({
        where: { id },
        select: {
          publishedAt: true,
          source: true
        }
      });

      if (isSyntheticReviewSource(existingReview?.source)) {
        await prisma.productReview.update({
          where: { id },
          data: {
            status: "HIDDEN",
            verifiedPurchase: false,
            publishedAt: null
          }
        });

        refreshReviewPaths(productSlug);
        return NextResponse.json(
          { error: "Synthetic consumer reviews cannot be published." },
          { status: 409 }
        );
      }

      await prisma.productReview.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: existingReview?.publishedAt ?? new Date()
        }
      });

      refreshReviewPaths(productSlug);
      return NextResponse.json({ ok: true });
    }

    const nextStatus = parseReviewStatus(body.status);
    const nextReviewDate = parseReviewDateInput(body.reviewDate);
    const existingReview = await prisma.productReview.findUnique({
      where: { id },
      select: {
        reviewDate: true,
        publishedAt: true,
        source: true,
        orderId: true
      }
    });
    const compliantStatus = getCompliantReviewStatus(existingReview?.source, nextStatus);
    const verifiedPurchase =
      Boolean(body.verifiedPurchase) &&
      canMarkReviewAsVerified({
        source: existingReview?.source,
        orderId: existingReview?.orderId
      });

    await prisma.productReview.update({
      where: { id },
      data: {
        rating: Math.max(1, Math.min(5, toInt(body.rating, 5))),
        title: (body.title || "").trim(),
        content: (body.content || "").trim(),
        displayName: (body.displayName || "").trim(),
        reviewDate: nextReviewDate ?? existingReview?.reviewDate ?? new Date(),
        status: compliantStatus,
        verifiedPurchase,
        incentivizedReview: Boolean(body.incentivizedReview),
        adminNotes: (body.adminNotes || "").trim() || null,
        publishedAt:
          compliantStatus === "PUBLISHED"
            ? existingReview?.publishedAt ?? nextReviewDate ?? new Date()
            : null
      }
    });

    refreshReviewPaths(productSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review item update failed:", error);
    return NextResponse.json({ error: "Review update failed." }, { status: 500 });
  }
}
