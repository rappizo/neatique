import { getActiveProductsForMerchantFeed } from "@/lib/queries";
import { buildGoogleMerchantFeed } from "@/lib/merchant-feed";

export const revalidate = 3600;

export async function GET() {
  try {
    const products = await getActiveProductsForMerchantFeed();

    return new Response(buildGoogleMerchantFeed(products), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
      }
    });
  } catch (error) {
    console.error("Unable to generate the Google Merchant product feed:", error);
    return new Response("Merchant feed temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}
