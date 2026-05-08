"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  buildDefaultComicProductLock,
  syncComicProductLocksFromActiveProducts
} from "@/lib/comic-product-locks";
import { prisma } from "@/lib/db";
import { toBool, toInt, toPlainString } from "@/lib/utils";
import { buildComicRedirect, revalidateComicRoutes } from "@/app/admin/comic-action-helpers";

const PRODUCT_LOCKS_PATH = "/admin/comic/product-locks";

export async function syncComicProductLocksAction() {
  await requireAdminSession();

  const result = await syncComicProductLocksFromActiveProducts();
  const status =
    result.createdCount > 0
      ? "product-locks-synced-created"
      : result.updatedCount > 0 || result.deactivatedCount > 0
        ? "product-locks-synced"
        : "product-locks-already-current";

  revalidateComicRoutes();
  redirect(buildComicRedirect(PRODUCT_LOCKS_PATH, status));
}

export async function resetComicProductLockDefaultsAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  if (!id) {
    redirect(buildComicRedirect(PRODUCT_LOCKS_PATH, "missing-product-lock"));
  }

  const lock = await prisma.comicProductLock.findUnique({
    where: { id },
    include: {
      product: true
    }
  });

  if (!lock) {
    redirect(buildComicRedirect(PRODUCT_LOCKS_PATH, "missing-product-lock"));
  }

  const defaults = buildDefaultComicProductLock(lock.product);

  await prisma.comicProductLock.update({
    where: { id },
    data: {
      ...defaults,
      active: lock.product.status === "ACTIVE"
    }
  });

  revalidateComicRoutes();
  redirect(buildComicRedirect(PRODUCT_LOCKS_PATH, "product-lock-reset"));
}

export async function updateComicProductLockAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  if (!id) {
    redirect(buildComicRedirect(PRODUCT_LOCKS_PATH, "missing-product-lock"));
  }

  const lock = await prisma.comicProductLock.findUnique({
    where: { id }
  });

  if (!lock) {
    redirect(buildComicRedirect(PRODUCT_LOCKS_PATH, "missing-product-lock"));
  }

  const displayName = toPlainString(formData.get("displayName"));
  const shortCode = toPlainString(formData.get("shortCode"))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12);
  const visualNotes = toPlainString(formData.get("visualNotes"));
  const usageNotes = toPlainString(formData.get("usageNotes"));

  if (!displayName || !shortCode || !visualNotes || !usageNotes) {
    redirect(buildComicRedirect(`${PRODUCT_LOCKS_PATH}#lock-${id}`, "missing-product-lock-fields"));
  }

  await prisma.comicProductLock.update({
    where: { id },
    data: {
      displayName,
      shortCode,
      visualNotes,
      usageNotes,
      referenceNotes: toPlainString(formData.get("referenceNotes")) || null,
      active: toBool(formData.get("active")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), lock.sortOrder))
    }
  });

  revalidateComicRoutes();
  redirect(buildComicRedirect(`${PRODUCT_LOCKS_PATH}#lock-${id}`, "product-lock-saved"));
}
