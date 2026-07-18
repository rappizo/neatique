import { NextResponse } from "next/server";
import { getCartItems } from "@/lib/cart";
import { getCurrentCustomerId } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [customerId, cartItems] = await Promise.all([getCurrentCustomerId(), getCartItems()]);

  return NextResponse.json(
    {
      signedIn: Boolean(customerId),
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
