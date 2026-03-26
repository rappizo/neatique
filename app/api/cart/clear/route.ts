import { NextResponse } from "next/server";
import { clearCartItems } from "@/lib/cart";

export async function POST() {
  await clearCartItems();
  return NextResponse.json({ cleared: true });
}
