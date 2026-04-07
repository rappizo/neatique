import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type { FulfillmentStatus, OrderStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        id?: string;
        status?: OrderStatus;
        fulfillmentStatus?: FulfillmentStatus;
        notes?: string;
      }
    | null;

  const id = payload?.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: (payload?.status || "PENDING") as OrderStatus,
      fulfillmentStatus: (payload?.fulfillmentStatus || "UNFULFILLED") as FulfillmentStatus,
      notes: payload?.notes?.trim() ? payload.notes.trim() : null
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  return NextResponse.json({ ok: true });
}
