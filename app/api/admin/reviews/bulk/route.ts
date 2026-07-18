import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isFullAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { SYNTHETIC_REVIEW_SOURCE } from "@/lib/review-compliance";

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
      productSlug?: string;
      intent?: "approve" | "mark-verified" | "mark-unverified" | "delete";
      reviewIds?: string[];
    };

    const productSlug = (body.productSlug || "").trim();
    const intent = body.intent || "delete";
    const reviewIds = Array.from(
      new Set((body.reviewIds || []).map((value) => value.trim()).filter(Boolean))
    );

    if (!productSlug) {
      return NextResponse.json({ error: "Missing product slug." }, { status: 400 });
    }

    if (reviewIds.length === 0) {
      return NextResponse.json({ error: "Select at least one review." }, { status: 400 });
    }

    if (intent === "approve") {
      await prisma.$transaction([
        prisma.productReview.updateMany({
          where: {
            id: {
              in: reviewIds
            },
            source: { not: SYNTHETIC_REVIEW_SOURCE }
          },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date()
          }
        }),
        prisma.productReview.updateMany({
          where: {
            id: {
              in: reviewIds
            },
            source: SYNTHETIC_REVIEW_SOURCE
          },
          data: {
            status: "HIDDEN",
            verifiedPurchase: false,
            publishedAt: null
          }
        })
      ]);
    } else if (intent === "mark-verified") {
      await prisma.productReview.updateMany({
        where: {
          id: {
            in: reviewIds
          },
          source: { not: SYNTHETIC_REVIEW_SOURCE },
          orderId: { not: null }
        },
        data: {
          verifiedPurchase: true
        }
      });
    } else if (intent === "mark-unverified") {
      await prisma.productReview.updateMany({
        where: {
          id: {
            in: reviewIds
          }
        },
        data: {
          verifiedPurchase: false
        }
      });
    } else {
      await prisma.productReview.deleteMany({
        where: {
          id: {
            in: reviewIds
          }
        }
      });
    }

    refreshReviewPaths(productSlug);
    return NextResponse.json({ ok: true, count: reviewIds.length });
  } catch (error) {
    console.error("Bulk review moderation failed:", error);
    return NextResponse.json({ error: "Bulk review action failed." }, { status: 500 });
  }
}
