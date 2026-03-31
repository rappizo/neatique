import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getReviewUrl } from "@/lib/review-links";

type ReviewExportRouteProps = {
  params: Promise<{ slug: string }>;
};

function formatCsvDate(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const year = `${date.getUTCFullYear()}`;
  return `${month}/${day}/${year}`;
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

export async function GET(_request: Request, { params }: ReviewExportRouteProps) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true
    }
  });

  if (!product) {
    return new NextResponse("Not found", { status: 404 });
  }

  const reviews = await prisma.productReview.findMany({
    where: {
      product: {
        slug
      }
    },
    orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      rating: true,
      reviewDate: true,
      displayName: true
    }
  });

  const header = [
    "Review Title",
    "Review Body",
    "Review Rating",
    "Review Created Date",
    "Review User Name",
    "Review Link"
  ];

  const rows = reviews.map((review) =>
    [
      review.title,
      review.content,
      review.rating,
      formatCsvDate(review.reviewDate),
      review.displayName,
      getReviewUrl(review.id)
    ]
      .map((value) => escapeCsvValue(value))
      .join(",")
  );

  const csv = [header.map((value) => escapeCsvValue(value)).join(","), ...rows].join("\r\n");
  const fileName = `${product.slug}-reviews-export.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
