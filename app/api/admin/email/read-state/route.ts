import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { MailboxFolderKey } from "@/lib/admin-mailbox";
import { updateMailboxReadState } from "@/lib/admin-mailbox";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        uid?: number;
        unread?: boolean;
        folder?: MailboxFolderKey;
      }
    | null;

  const uid = Number(payload?.uid ?? 0);
  const unread = Boolean(payload?.unread);
  const folder = payload?.folder === "sent" ? "sent" : "inbox";

  if (!Number.isFinite(uid) || uid <= 0) {
    return NextResponse.json({ error: "Mailbox message UID is required." }, { status: 400 });
  }

  try {
    await updateMailboxReadState({ uid, unread, folder });
    return NextResponse.json({
      ok: true,
      unread,
      folder
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Mailbox update failed."
      },
      { status: 500 }
    );
  }
}
