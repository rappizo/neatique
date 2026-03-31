import { cookies } from "next/headers";
import type { CouponRecord, ProductRecord } from "@/lib/types";
import { expireCouponsIfNeeded } from "@/lib/coupon-expiration";
import { prisma } from "@/lib/db";
import { getProducts } from "@/lib/queries";
import {
  buildDiscountedCartLines,
  buildDiscountedStripeLineItems,
  couponsCanBeCombined,
  normalizeCouponCode,
  parseStoredCouponProductCodes
} from "@/lib/coupons";

const CART_COOKIE_NAME = "neatique-cart";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  couponCodes: string[];
};

type AppliedCartCoupon = Pick<
  CouponRecord,
  | "id"
  | "code"
  | "content"
  | "active"
  | "combinable"
  | "appliesToAll"
  | "productCodes"
  | "discountType"
  | "percentOff"
  | "amountOffCents"
  | "expiresAt"
  | "usageMode"
  | "usageCount"
  | "createdAt"
  | "updatedAt"
>;

export type CartLine = {
  product: ProductRecord;
  quantity: number;
  lineTotalCents: number;
  originalLineTotalCents: number;
  discountCents: number;
};

function sanitizeCart(items: CartItem[]) {
  return items
    .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.min(10, Math.trunc(item.quantity)))
    }));
}

function sanitizeCouponCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.map((item) => normalizeCouponCode(String(item || ""))).filter(Boolean)
    )
  );
}

async function getCartState(): Promise<CartState> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!raw) {
    return {
      items: [],
      couponCodes: []
    };
  }

  try {
    const parsed = JSON.parse(raw) as CartItem[] | { items?: CartItem[]; couponCodes?: string[] };

    if (Array.isArray(parsed)) {
      return {
        items: sanitizeCart(parsed),
        couponCodes: []
      };
    }

    return {
      items: sanitizeCart(Array.isArray(parsed.items) ? parsed.items : []),
      couponCodes: sanitizeCouponCodes(parsed.couponCodes)
    };
  } catch {
    return {
      items: [],
      couponCodes: []
    };
  }
}

async function setCartState(state: CartState) {
  const cookieStore = await cookies();
  const nextState: CartState = {
    items: sanitizeCart(state.items),
    couponCodes: sanitizeCouponCodes(state.couponCodes)
  };

  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: JSON.stringify(nextState),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

function mapCouponRecord(coupon: any): AppliedCartCoupon {
  return {
    id: coupon.id,
    code: coupon.code,
    content: coupon.content,
    active: coupon.active,
    combinable: coupon.combinable,
    appliesToAll: coupon.appliesToAll,
    productCodes: parseStoredCouponProductCodes(coupon.productCodes),
    discountType: coupon.discountType,
    percentOff: coupon.percentOff ?? null,
    amountOffCents: coupon.amountOffCents ?? null,
    expiresAt: coupon.expiresAt ?? null,
    usageMode: coupon.usageMode,
    usageCount: coupon.usageCount,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt
  };
}

async function resolveAppliedCoupons(lines: Array<{ product: ProductRecord; quantity: number; lineTotalCents: number }>, couponCodes: string[]) {
  if (couponCodes.length === 0 || lines.length === 0) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: null as string | null
    };
  }

  await expireCouponsIfNeeded();

  const couponRows = await prisma.coupon.findMany({
    where: {
      code: {
        in: couponCodes
      }
    }
  });
  const couponRowMap = new Map(couponRows.map((coupon) => [coupon.code, coupon]));
  const resolvedCoupons = couponCodes
    .map((code) => couponRowMap.get(code))
    .filter((coupon): coupon is NonNullable<typeof coupon> => Boolean(coupon))
    .map(mapCouponRecord);

  if (
    couponCodes.some((code) => {
      const coupon = couponRowMap.get(code);
      return Boolean(coupon?.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now());
    })
  ) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: "coupon-expired" as const
    };
  }

  if (
    resolvedCoupons.length !== couponCodes.length ||
    resolvedCoupons.some((coupon) => !coupon.active)
  ) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: "coupon-invalid" as const
    };
  }

  if (!couponsCanBeCombined(resolvedCoupons)) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: "coupon-conflict" as const
    };
  }

  if (resolvedCoupons.some((coupon) => coupon.usageMode === "SINGLE_USE" && coupon.usageCount > 0)) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: "coupon-used" as const
    };
  }

  const { discountCents, appliedCouponCodes, lineItems } = buildDiscountedStripeLineItems(lines, resolvedCoupons);

  if (discountCents <= 0 || appliedCouponCodes.length !== resolvedCoupons.length) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: "coupon-not-eligible" as const
    };
  }

  if (lineItems.length === 0) {
    return {
      enteredCouponCodes: couponCodes,
      appliedCoupons: [] as AppliedCartCoupon[],
      appliedCouponCodes: [] as string[],
      discountCents: 0,
      couponError: "coupon-over-discount" as const
    };
  }

  return {
    enteredCouponCodes: couponCodes,
    appliedCoupons: resolvedCoupons,
    appliedCouponCodes,
    discountCents,
    couponError: null as string | null
  };
}

export async function getCartItems(): Promise<CartItem[]> {
  const state = await getCartState();
  return state.items;
}

export async function getCartCouponCodes(): Promise<string[]> {
  const state = await getCartState();
  return state.couponCodes;
}

export async function setCartItems(items: CartItem[]) {
  const state = await getCartState();
  await setCartState({
    items,
    couponCodes: state.couponCodes
  });
}

export async function setCartCouponCodes(couponCodes: string[]) {
  const state = await getCartState();
  await setCartState({
    items: state.items,
    couponCodes
  });
}

export async function clearCartCoupons() {
  const state = await getCartState();
  await setCartState({
    items: state.items,
    couponCodes: []
  });
}

export async function clearCartItems() {
  await setCartState({
    items: [],
    couponCodes: []
  });
}

export async function addCartItem(productId: string, quantity: number) {
  const state = await getCartState();
  const items = [...state.items];
  const existing = items.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity = Math.max(1, Math.min(10, existing.quantity + quantity));
  } else {
    items.push({
      productId,
      quantity
    });
  }

  await setCartState({
    items,
    couponCodes: state.couponCodes
  });
}

export async function updateCartItem(productId: string, quantity: number) {
  const state = await getCartState();
  const nextItems =
    quantity <= 0
      ? state.items.filter((item) => item.productId !== productId)
      : state.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) }
            : item
        );

  await setCartState({
    items: nextItems,
    couponCodes: state.couponCodes
  });
}

export async function removeCartItem(productId: string) {
  const state = await getCartState();
  await setCartState({
    items: state.items.filter((item) => item.productId !== productId),
    couponCodes: state.couponCodes
  });
}

export async function getCartDetails() {
  const [{ items, couponCodes }, products] = await Promise.all([getCartState(), getProducts()]);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const baseLines = items
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
    .filter((line): line is { product: ProductRecord; quantity: number; lineTotalCents: number } => Boolean(line));

  const couponResolution = await resolveAppliedCoupons(baseLines, couponCodes);
  const discountedLines = buildDiscountedCartLines(baseLines, couponResolution.appliedCoupons);
  const fullProductMap = new Map(baseLines.map((line) => [line.product.id, line.product]));
  const lines: CartLine[] = discountedLines.map((line) => {
    const product = fullProductMap.get(line.product.id);

    if (!product) {
      throw new Error(`Missing full cart product for ${line.product.id}`);
    }

    return {
      product,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
      originalLineTotalCents: line.originalLineTotalCents,
      discountCents: line.discountCents
    };
  });
  const subtotalCents = lines.reduce((sum, line) => sum + line.originalLineTotalCents, 0);
  const discountedSubtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    lines,
    subtotalCents,
    discountedSubtotalCents,
    discountCents: couponResolution.discountCents,
    itemCount,
    couponCodes: couponResolution.enteredCouponCodes,
    appliedCouponCodes: couponResolution.appliedCouponCodes,
    appliedCoupons: couponResolution.appliedCoupons,
    couponError: couponResolution.couponError
  };
}

export async function previewCartCouponCodes(couponCodes: string[]) {
  const details = await getCartDetails();
  const baseLines = details.lines.map((line) => ({
    product: line.product,
    quantity: line.quantity,
    lineTotalCents: line.originalLineTotalCents
  }));

  return resolveAppliedCoupons(baseLines, couponCodes);
}
