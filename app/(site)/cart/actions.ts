"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCartItem,
  clearCartCoupons,
  clearCartItems,
  previewCartCouponCodes,
  removeCartItem,
  setCartCouponCodes,
  updateCartItem
} from "@/lib/cart";
import { parseCouponCodesInput } from "@/lib/coupons";
import { toInt, toPlainString } from "@/lib/utils";

export async function addToCartAction(formData: FormData) {
  const productId = toPlainString(formData.get("productId"));
  const quantity = toInt(formData.get("quantity"), 1);
  const redirectTo = toPlainString(formData.get("redirectTo")) || "/cart?status=added";

  await addCartItem(productId, quantity);
  revalidatePath("/cart");
  redirect(redirectTo);
}

export async function updateCartItemAction(formData: FormData) {
  const productId = toPlainString(formData.get("productId"));
  const quantity = toInt(formData.get("quantity"), 1);

  await updateCartItem(productId, quantity);
  revalidatePath("/cart");
  redirect("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const productId = toPlainString(formData.get("productId"));

  await removeCartItem(productId);
  revalidatePath("/cart");
  redirect("/cart");
}

export async function clearCartAction() {
  await clearCartItems();
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartCouponsAction(formData: FormData) {
  const rawCouponCodes = parseCouponCodesInput(toPlainString(formData.get("couponCodes")));

  if (rawCouponCodes.length === 0) {
    await clearCartCoupons();
    revalidatePath("/cart");
    redirect("/cart?status=coupon-updated");
  }

  const resolution = await previewCartCouponCodes(rawCouponCodes);

  if (resolution.couponError) {
    redirect(`/cart?error=${resolution.couponError}`);
  }

  await setCartCouponCodes(rawCouponCodes);
  revalidatePath("/cart");
  redirect("/cart?status=coupon-updated");
}
