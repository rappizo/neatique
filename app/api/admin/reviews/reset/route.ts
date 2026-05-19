import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateFullAdminCredentials } from "@/lib/admin-auth";
import { sampleReviews } from "@/lib/sample-store-data";

export const runtime = "nodejs";

type ProductLookup = {
  id: string;
  slug: string;
  name: string;
};

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

function buildSeedRows(products: ProductLookup[]) {
  const productIdBySlug = new Map(products.map((product) => [product.slug, product.id]));
  const productNameBySlug = new Map(products.map((product) => [product.slug, product.name]));
  const insertedByProduct = new Map<string, number>();

  const rows = sampleReviews
    .map((review) => {
      const slug = review.productSlug;

      if (!slug) {
        return null;
      }

      const productId = productIdBySlug.get(slug);

      if (!productId) {
        return null;
      }

      insertedByProduct.set(slug, (insertedByProduct.get(slug) ?? 0) + 1);

      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        displayName: review.displayName,
        reviewDate: review.reviewDate,
        status: review.status,
        verifiedPurchase: review.verifiedPurchase,
        adminNotes: review.adminNotes,
        source: review.source,
        productId,
        customerId: null,
        orderId: null,
        publishedAt: review.publishedAt
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return {
    rows,
    insertedByProduct: Array.from(insertedByProduct.entries()).map(([slug, count]) => ({
      slug,
      productName: productNameBySlug.get(slug) ?? slug,
      count
    }))
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true
    }
  });
  const { rows, insertedByProduct } = buildSeedRows(products);

  return NextResponse.json({
    ok: true,
    dryRun: true,
    totalSeedRows: rows.length,
    productCount: insertedByProduct.length,
    insertedByProduct
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true
    }
  });
  const { rows, insertedByProduct } = buildSeedRows(products);

  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No seed review rows could be generated from current products."
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.productReview.deleteMany({
      where: {
        productId: {
          in: products.map((product) => product.id)
        }
      }
    });
    let inserted = 0;

    for (let index = 0; index < rows.length; index += 100) {
      const chunk = rows.slice(index, index + 100);
      if (chunk.length === 0) {
        continue;
      }

      const createResult = await tx.productReview.createMany({
        data: chunk,
        skipDuplicates: true
      });
      inserted += createResult.count;
    }

    return {
      deletedCount: deleted.count,
      insertedCount: inserted
    };
  });

  return NextResponse.json({
    ok: true,
    dryRun: false,
    deletedCount: result.deletedCount,
    insertedCount: result.insertedCount,
    insertedByProduct
  });
}
