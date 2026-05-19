import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateFullAdminCredentials } from "@/lib/admin-auth";
import { buildReviewDeduplicationPlan } from "@/lib/review-dedupe";

export const runtime = "nodejs";

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Neatique Admin"'
      }
    }
  );
}

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return false;
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    return validateFullAdminCredentials(username, password);
  } catch {
    return false;
  }
}

async function loadPublishedReviews() {
  return prisma.productReview.findMany({
    where: {
      status: "PUBLISHED"
    },
    include: {
      product: true
    },
    orderBy: [{ productId: "asc" }, { createdAt: "asc" }]
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const reviews = await loadPublishedReviews();
  const plan = buildReviewDeduplicationPlan(reviews);

  return NextResponse.json({
    ok: true,
    dryRun: true,
    ...plan
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const reviews = await loadPublishedReviews();
  const plan = buildReviewDeduplicationPlan(reviews);

  for (const update of plan.updates) {
    const existing = reviews.find((review) => review.id === update.id);
    const dedupeNote = `Auto-deduped on ${new Date().toISOString().slice(0, 10)} to replace exact duplicate review copy.`;
    const nextAdminNotes = existing?.adminNotes
      ? `${existing.adminNotes}\n${dedupeNote}`
      : dedupeNote;

    await prisma.productReview.update({
      where: {
        id: update.id
      },
      data: {
        title: update.title,
        content: update.content,
        adminNotes: nextAdminNotes
      }
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    updatedCount: plan.updates.length,
    duplicateGroupCount: plan.duplicateGroupCount,
    updatedReviews: plan.updates.map((update) => ({
      id: update.id,
      productName: update.productName,
      originalTitle: update.originalTitle,
      newTitle: update.title
    }))
  });
}
