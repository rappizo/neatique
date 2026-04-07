import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        id?: string;
        giftSent?: boolean;
        adminNote?: string;
      }
    | null;

  const id = payload?.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "Missing OMB claim id." }, { status: 400 });
  }

  const giftSent = Boolean(payload?.giftSent);

  await prisma.ombClaim.update({
    where: { id },
    data: {
      giftSent,
      giftSentAt: giftSent ? new Date() : null,
      adminNote: payload?.adminNote?.trim() ? payload.adminNote.trim() : null
    }
  });

  revalidatePath("/admin/omb-claims");

  return NextResponse.json({ ok: true });
}
