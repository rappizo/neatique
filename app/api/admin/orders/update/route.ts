import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isOrderConflictError,
  updateOrderWithReconciliation
} from "@/lib/admin-order-updates";
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

  try {
    const result = await updateOrderWithReconciliation({
      id,
      status: (payload?.status || "PENDING") as OrderStatus,
      fulfillmentStatus: (payload?.fulfillmentStatus || "UNFULFILLED") as FulfillmentStatus,
      notes: payload?.notes?.trim() ? payload.notes.trim() : null
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/rewards");
    revalidatePath("/shop");

    return NextResponse.json({
      ok: true,
      order: result.order,
      activityLog: result.activityLog,
      summary: result.summary
    });
  } catch (error) {
    if (isOrderConflictError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("Admin order update failed:", error);
    return NextResponse.json({ error: "Order update failed." }, { status: 500 });
  }
}
