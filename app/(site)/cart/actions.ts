"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCartItem,
  clearCartCoupons,
  clearCartItems,
  getCartDetails,
  previewCartCouponCodes,
  removeCartItem,
  setCartCouponCodes,
  updateCartItem
} from "@/lib/cart";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { setCheckoutDraft } from "@/lib/checkout-draft";
import { parseCouponCodesInput } from "@/lib/coupons";
import { toInt, toPlainString } from "@/lib/utils";

export async function addToCartAction(formData: FormData) {
  const productId = toPlainString(formData.get("productId"));
  const quantity = toInt(formData.get("quantity"), 1);

  await addCartItem(productId, quantity);
  revalidatePath("/cart");
  const eventId = randomUUID();
  redirect(
    `/cart?status=added&added_product_id=${encodeURIComponent(productId)}&added_quantity=${Math.max(1, Math.min(10, quantity))}&ga_event_id=${eventId}`
  );
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

export async function beginCheckoutConfirmationAction(formData: FormData) {
  const [{ itemCount }, currentCustomer] = await Promise.all([getCartDetails(), getCurrentCustomer()]);
  const email = toPlainString(formData.get("email")).toLowerCase();
  const firstName = toPlainString(formData.get("firstName"));
  const lastName = toPlainString(formData.get("lastName"));

  if (itemCount <= 0) {
    redirect("/cart?error=empty-cart");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !firstName || !lastName) {
    redirect("/cart?error=contact");
  }

  await setCheckoutDraft({
    email,
    firstName,
    lastName,
    shippingAddress: null,
    billingAddress: null,
    billingSameAsShipping: true
  });

  if (currentCustomer?.id) {
    revalidatePath("/account");
  }

  revalidatePath("/cart");
  redirect(`/checkout/confirmation?ga_event_id=${randomUUID()}`);
}
