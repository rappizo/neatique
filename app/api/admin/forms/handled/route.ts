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
        formKey?: string;
        nextHandled?: boolean;
      }
    | null;

  const id = payload?.id?.trim();
  const formKey = payload?.formKey?.trim();
  const nextHandled = Boolean(payload?.nextHandled);

  if (!id || !formKey) {
    return NextResponse.json({ error: "Missing submission id or form key." }, { status: 400 });
  }

  const result = await prisma.formSubmission.updateMany({
    where: {
      id,
      formKey
    },
    data: {
      handled: nextHandled,
      handledAt: nextHandled ? new Date() : null
    }
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${formKey}`);
  revalidatePath(`/admin/forms/${formKey}/${id}`);

  return NextResponse.json({
    ok: true,
    handled: nextHandled
  });
}
