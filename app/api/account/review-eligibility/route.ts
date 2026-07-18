import { NextResponse } from "next/server";
import { getCurrentCustomerId } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  const customerId = await getCurrentCustomerId();

  if (!productId || !customerId) {
    return NextResponse.json(
      { signedIn: Boolean(customerId), eligible: false },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const purchasedItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        customerId,
        status: { in: ["PAID", "FULFILLED"] }
      }
    },
    select: { id: true }
  });

  return NextResponse.json(
    { signedIn: true, eligible: Boolean(purchasedItem) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
