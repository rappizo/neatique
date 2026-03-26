import { cookies } from "next/headers";
import { getProducts } from "@/lib/queries";
import type { ProductRecord } from "@/lib/types";

const CART_COOKIE_NAME = "neatique-cart";

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartLine = {
  product: ProductRecord;
  quantity: number;
  lineTotalCents: number;
};

function sanitizeCart(items: CartItem[]) {
  return items
    .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.min(10, Math.trunc(item.quantity)))
    }));
}

export async function getCartItems(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return sanitizeCart(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export async function setCartItems(items: CartItem[]) {
  const cookieStore = await cookies();
  const nextItems = sanitizeCart(items);

  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: JSON.stringify(nextItems),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearCartItems() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: "[]",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function addCartItem(productId: string, quantity: number) {
  const items = await getCartItems();
  const existing = items.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity = Math.max(1, Math.min(10, existing.quantity + quantity));
  } else {
    items.push({
      productId,
      quantity
    });
  }

  await setCartItems(items);
}

export async function updateCartItem(productId: string, quantity: number) {
  const items = await getCartItems();
  const nextItems =
    quantity <= 0
      ? items.filter((item) => item.productId !== productId)
      : items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) }
            : item
        );

  await setCartItems(nextItems);
}

export async function removeCartItem(productId: string) {
  const items = await getCartItems();
  await setCartItems(items.filter((item) => item.productId !== productId));
}

export async function getCartDetails() {
  const [items, products] = await Promise.all([getCartItems(), getProducts()]);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const lines: CartLine[] = items
    .map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        lineTotalCents: product.priceCents * item.quantity
      };
    })
    .filter((line): line is CartLine => Boolean(line));

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    lines,
    subtotalCents,
    itemCount
  };
}
