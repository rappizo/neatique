"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { buildComicRedirect, revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { toPlainString } from "@/lib/utils";

export async function syncComicWorkspaceAction(formData?: FormData) {
  await requireAdminSession();
  const redirectTo = toPlainString(formData?.get("redirectTo") ?? null) || "/admin/comic";

  try {
    const { syncComicWorkspaceToDatabase } = await import("@/lib/comic-workspace-sync");
    await syncComicWorkspaceToDatabase();
    revalidateComicRoutes();
    redirect(buildComicRedirect(redirectTo, "workspace-synced"));
  } catch (error) {
    console.error("Comic workspace sync failed:", error);
    redirect(buildComicRedirect(redirectTo, "workspace-sync-failed"));
  }
}
