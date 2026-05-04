"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { deleteComicImageCreation } from "@/lib/comic-image-creation";
import { toPlainString } from "@/lib/utils";

export async function deleteComicImageCreationAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  await deleteComicImageCreation(id);
  redirect("/admin/comic/image-creation");
}
